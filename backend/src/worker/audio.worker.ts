import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const sdk = require('microsoft-cognitiveservices-speech-sdk');

@Processor('audio-processing-queue', {
    concurrency: 1,
    maxStalledCount: 1,
    stalledInterval: 300000,
})
export class AudioWorker extends WorkerHost {
    private readonly logger = new Logger(AudioWorker.name);

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing audio job ${job.id} for assessment ${job.data.assessmentId}`);

        const assessment = await this.prisma.assessment.findUnique({
            where: { id: job.data.assessmentId },
            include: { candidate: true }
        });

        if (!assessment || assessment.status !== 'AUDIO_PROCESSING') {
            this.logger.warn(`Assessment ${job.data.assessmentId} not found or not in AUDIO_PROCESSING status`);
            return;
        }

        try {
            let audioScore = 50; // Default fallback score
            let rawScores: any = {};
            let transcript = '';

            const azureKey = process.env.AZURE_SPEECH_KEY;
            const azureRegion = process.env.AZURE_SPEECH_REGION;

            if (azureKey && azureRegion && job.data.audioBase64) {
                this.logger.log(`Running Azure Pronunciation Assessment... (audio mime: ${job.data.audioMimeType})`);

                try {
                    // Convert WebM to WAV using ffmpeg for Azure compatibility
                    const wavBuffer = await this.convertToWav(
                        Buffer.from(job.data.audioBase64, 'base64'),
                        job.data.audioMimeType || 'audio/webm'
                    );

                    this.logger.log(`Audio converted to WAV: ${wavBuffer.length} bytes`);

                    const result = await this.runAzurePronunciationAssessment(
                        azureKey,
                        azureRegion,
                        wavBuffer,
                    );
                    audioScore = result.audioScore;
                    rawScores = result.rawScores;
                    transcript = result.transcript;
                    this.logger.log(`Azure assessment complete: score=${audioScore}, transcript="${transcript.substring(0, 100)}..."`);
                } catch (azureErr: any) {
                    this.logger.error('Azure Speech API failed, using fallback score', azureErr?.message || azureErr);
                }
            } else {
                this.logger.warn('Cannot run Azure assessment. Missing:');
                if (!azureKey) this.logger.warn('  - AZURE_SPEECH_KEY not set');
                if (!azureRegion) this.logger.warn('  - AZURE_SPEECH_REGION not set');
                if (!job.data.audioBase64) this.logger.warn('  - No audio data in job payload (audioBase64 is null/empty)');
                this.logger.warn(`Job data keys: ${Object.keys(job.data).join(', ')}`);
            }

            const candidate = assessment.candidate;
            const applicationScore = candidate.applicationScore || 0;
            const mcqScore = assessment.mcqScore || 0;

            // Final composite score just for reference
            const finalScore = (applicationScore * 0.3) + (mcqScore * 0.4) + (audioScore * 0.3);

            let newStatus = 'REJECTED_FINAL';
            if (audioScore >= 75) newStatus = 'SELECTED';
            else if (audioScore >= 50) newStatus = 'MANUAL_REVIEW';

            await this.prisma.assessment.update({
                where: { id: assessment.id },
                data: {
                    audioScore,
                    finalScore,
                    aiSpeechRawScores: rawScores,
                    aiSpeechTranscript: transcript,
                    status: 'COMPLETED'
                }
            });

            await this.prisma.candidate.update({
                where: { id: assessment.candidateId },
                data: {
                    status: newStatus,
                    finalScore
                }
            });

            await this.notifications.sendFinalDecisionEmail(candidate.email, newStatus);

            this.logger.log(`Successfully processed audio for assessment ${job.data.assessmentId}, Final Score: ${finalScore.toFixed(1)}, Status: ${newStatus}`);
        } catch (err) {
            this.logger.error(`Error processing job ${job.id}`, err);

            if (job.attemptsMade >= 2) {
                await this.prisma.candidate.update({
                    where: { id: assessment.candidateId },
                    data: { status: 'AUDIO_FAILED' }
                });
            }
            throw err;
        }
    }

    /**
     * Convert audio buffer (WebM/Opus) to WAV format using ffmpeg
     * Azure Speech SDK requires WAV, OGG, or other standard formats
     */
    private convertToWav(audioBuffer: Buffer, mimeType: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const ffmpegPath = require('ffmpeg-static');
            const { execFile } = require('child_process');

            const tmpDir = os.tmpdir();
            const inputExt = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : 'webm';
            const inputPath = path.join(tmpDir, `input-${Date.now()}.${inputExt}`);
            const outputPath = path.join(tmpDir, `output-${Date.now()}.wav`);

            // Write input file
            fs.writeFileSync(inputPath, audioBuffer);

            // Convert to 16kHz 16-bit mono WAV (optimal for Azure Speech)
            execFile(ffmpegPath, [
                '-i', inputPath,
                '-ar', '16000',       // 16kHz sample rate
                '-ac', '1',           // mono
                '-sample_fmt', 's16', // 16-bit
                '-f', 'wav',
                '-y',                 // overwrite
                outputPath
            ], (error: any, _stdout: string, stderr: string) => {
                // Cleanup input file
                try { fs.unlinkSync(inputPath); } catch { }

                if (error) {
                    try { fs.unlinkSync(outputPath); } catch { }
                    this.logger.error(`FFmpeg conversion failed: ${stderr}`);
                    reject(new Error(`FFmpeg failed: ${error.message}`));
                    return;
                }

                try {
                    const wavBuffer = fs.readFileSync(outputPath);
                    fs.unlinkSync(outputPath);
                    resolve(wavBuffer);
                } catch (readErr) {
                    reject(readErr);
                }
            });
        });
    }

    private runAzurePronunciationAssessment(
        key: string,
        region: string,
        wavBuffer: Buffer,
    ): Promise<{ audioScore: number; rawScores: any; transcript: string }> {
        return new Promise((resolve, reject) => {
            const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create push stream with explicit WAV format (16kHz, 16-bit, mono)
            const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
            const pushStream = sdk.AudioInputStream.createPushStream(format);

            // Skip WAV header (44 bytes) and push raw PCM data
            const pcmData = wavBuffer.slice(44);
            pushStream.write(pcmData);
            pushStream.close();

            const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

            // Configure Pronunciation Assessment
            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
                '', // reference text (empty = open-ended)
                sdk.PronunciationAssessmentGradingSystem.HundredMark,
                sdk.PronunciationAssessmentGranularity.Phoneme,
                true // enable miscue
            );
            pronunciationConfig.enableProsodyAssessment = true;

            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            pronunciationConfig.applyTo(recognizer);

            let allResults: any[] = [];
            let fullTranscript = '';

            // Set a timeout to prevent hanging forever
            const timeout = setTimeout(() => {
                this.logger.warn('Azure recognition timed out after 30s');
                recognizer.stopContinuousRecognitionAsync();
            }, 30000);

            recognizer.recognized = (_: any, e: any) => {
                if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    const pronResult = sdk.PronunciationAssessmentResult.fromResult(e.result);
                    fullTranscript += e.result.text + ' ';
                    allResults.push({
                        accuracy: pronResult.accuracyScore,
                        fluency: pronResult.fluencyScore,
                        pronunciation: pronResult.pronunciationScore,
                        completeness: pronResult.completenessScore,
                        prosody: pronResult.prosodyScore || 0,
                    });
                    this.logger.log(`Recognized segment: "${e.result.text}" (accuracy: ${pronResult.accuracyScore})`);
                } else if (e.result.reason === sdk.ResultReason.NoMatch) {
                    this.logger.warn('Azure: No speech could be recognized in this segment');
                }
            };

            recognizer.canceled = (_: any, e: any) => {
                clearTimeout(timeout);
                this.logger.warn(`Azure recognition canceled: reason=${e.reason}, errorDetails=${e.errorDetails || 'none'}`);
                recognizer.stopContinuousRecognitionAsync();
                if (e.reason === sdk.CancellationReason.Error) {
                    reject(new Error(`Azure Speech Error: ${e.errorDetails}`));
                }
            };

            recognizer.sessionStopped = () => {
                clearTimeout(timeout);
                recognizer.stopContinuousRecognitionAsync();

                if (allResults.length === 0) {
                    this.logger.warn('Azure: No speech segments were recognized at all');
                    resolve({ audioScore: 50, rawScores: { note: 'No speech detected' }, transcript: '' });
                    return;
                }

                // Average all results
                const avg = (field: string) =>
                    allResults.reduce((sum, r) => sum + (r[field] || 0), 0) / allResults.length;

                const rawScores = {
                    accuracy: Math.round(avg('accuracy') * 100) / 100,
                    fluency: Math.round(avg('fluency') * 100) / 100,
                    pronunciation: Math.round(avg('pronunciation') * 100) / 100,
                    completeness: Math.round(avg('completeness') * 100) / 100,
                    prosody: Math.round(avg('prosody') * 100) / 100,
                };

                const audioScore = Math.round(
                    (rawScores.accuracy * 0.3) +
                    (rawScores.fluency * 0.25) +
                    (rawScores.pronunciation * 0.25) +
                    (rawScores.completeness * 0.1) +
                    (rawScores.prosody * 0.1)
                );

                this.logger.log(`Azure scores: ${JSON.stringify(rawScores)}`);

                resolve({
                    audioScore,
                    rawScores,
                    transcript: fullTranscript.trim(),
                });
            };

            recognizer.startContinuousRecognitionAsync(
                () => this.logger.log('Azure continuous recognition started'),
                (err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            );
        });
    }
}
