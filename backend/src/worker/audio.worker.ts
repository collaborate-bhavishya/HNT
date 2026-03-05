import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const sdk = require('microsoft-cognitiveservices-speech-sdk');

@Processor('audio-processing-queue', {
    concurrency: 1,
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
                this.logger.log('Running Azure Pronunciation Assessment...');

                try {
                    const result = await this.runAzurePronunciationAssessment(
                        azureKey,
                        azureRegion,
                        Buffer.from(job.data.audioBase64, 'base64'),
                    );
                    audioScore = result.audioScore;
                    rawScores = result.rawScores;
                    transcript = result.transcript;
                    this.logger.log(`Azure assessment complete: score=${audioScore}`);
                } catch (azureErr) {
                    this.logger.error('Azure Speech API failed, using fallback score', azureErr);
                }
            } else {
                this.logger.warn('No Azure credentials or audio data. Using fallback score.');
                if (!job.data.audioBase64) {
                    this.logger.warn('No audio data in job payload');
                }
            }

            const candidate = assessment.candidate;
            const applicationScore = candidate.applicationScore || 0;
            const mcqScore = assessment.mcqScore || 0;

            // Final composite score: 30% application AI + 40% MCQ + 30% audio
            const finalScore = (applicationScore * 0.3) + (mcqScore * 0.4) + (audioScore * 0.3);

            let newStatus = 'REJECTED_FINAL';
            if (finalScore >= 75) newStatus = 'SELECTED';
            else if (finalScore >= 60) newStatus = 'MANUAL_REVIEW';

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

    private runAzurePronunciationAssessment(
        key: string,
        region: string,
        audioBuffer: Buffer,
    ): Promise<{ audioScore: number; rawScores: any; transcript: string }> {
        return new Promise((resolve, reject) => {
            const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Create push stream from audio buffer
            const pushStream = sdk.AudioInputStream.createPushStream();
            pushStream.write(audioBuffer);
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
                }
            };

            recognizer.canceled = (_: any, e: any) => {
                recognizer.stopContinuousRecognitionAsync();
                if (e.reason === sdk.CancellationReason.Error) {
                    reject(new Error(`Azure Speech Error: ${e.errorDetails}`));
                }
            };

            recognizer.sessionStopped = () => {
                recognizer.stopContinuousRecognitionAsync();

                if (allResults.length === 0) {
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

                resolve({
                    audioScore,
                    rawScores,
                    transcript: fullTranscript.trim(),
                });
            };

            recognizer.startContinuousRecognitionAsync(
                () => this.logger.log('Azure continuous recognition started'),
                (err: any) => reject(err)
            );
        });
    }
}
