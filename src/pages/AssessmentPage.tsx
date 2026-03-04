import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { AlertCircle, Clock, Mic, Square, Play, CheckCircle2 } from 'lucide-react';

const EXAM_DURATION_SECONDS = 30 * 60; // Fallback

export default function AssessmentPage() {
  const { token } = useParams();

  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  // API State
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorInitial, setErrorInitial] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MCQ state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Timer state
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);

  // Anti-cheat state
  const [warnings, setWarnings] = useState(0);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(-1);
  const audioBlobRef = useRef<Blob | null>(null);

  // --- API FETCH ---
  useEffect(() => {
    if (!token) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    fetch(`${API_URL}/api/assessment/${token}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setErrorInitial(data.message || 'Failed to load assessment');
        } else {
          setQuestions(data.questions);
          setTimeLeft(data.duration);
        }
      })
      .catch(err => {
        console.error(err);
        setErrorInitial('Network error loading assessment');
      })
      .finally(() => setLoadingInitial(false));
  }, [token]);

  // --- ANTI-CHEAT & TIMER ---
  useEffect(() => {
    if (!started || completed) return;

    // Timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Anti-cheat (Tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(w => {
          const newWarnings = w + 1;
          alert(`Warning ${newWarnings}/3: Please do not leave the exam tab. Further violations will result in auto-submission.`);
          if (newWarnings >= 3) {
            handleComplete();
          }
          return newWarnings;
        });
      }
    };

    // Anti-cheat (Before unload)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [started, completed]);

  // --- AUDIO RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        animationFrameRef.current = requestAnimationFrame(drawWaveform);

        analyserRef.current.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = 'rgb(249, 250, 251)'; // bg-gray-50
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(34, 197, 94)'; // text-primary-500

        canvasCtx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * canvas.height / 2;

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
      };

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please ensure you have granted permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const handleComplete = async () => {
    // Build Payload to Match Sprint 2
    const formData = new FormData();
    formData.append('timeTakenSeconds', String(EXAM_DURATION_SECONDS - timeLeft));
    formData.append('tabSwitchWarnings', String(warnings));
    formData.append('mcqAnswers', JSON.stringify(
      Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId: Number(questionId),
        selectedOption
      }))
    ));

    if (audioBlobRef.current) {
      formData.append('audio', audioBlobRef.current, 'recording.webm');
    }

    // Live API Submit
    console.log(`Submitting Assessment to /api/assessment/${token}/submit`);
    setIsSubmitting(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/assessment/${token}/submit`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Error submitting assessment');
        return;
      }
      setCompleted(true);
    } catch (err) {
      console.error(err);
      alert('Network error submitting assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Views
  if (loadingInitial) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-medium">Loading Assessment Securely...</div>;
  }

  if (errorInitial) {
    return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-medium text-red-600 gap-4">
      <AlertCircle className="w-12 h-12" />
      <p>{errorInitial}</p>
    </div>;
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Welcome to Your Assessment</CardTitle>
            <CardDescription>
              Assessment Token: {token || 'Demo'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Important Instructions:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>The assessment is <strong>30 minutes</strong> long.</li>
                  <li>Do not refresh the page or it will be auto-submitted.</li>
                  <li><strong>Do not switch tabs.</strong> Doing so more than 3 times will result in termination.</li>
                  <li>You will need a working microphone for the final audio recording section.</li>
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setStarted(true)} className="w-full text-lg h-12">Start Assessment</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-primary-500" />
          </div>
          <CardTitle className="text-2xl">Assessment Submitted</CardTitle>
          <CardDescription className="text-base text-gray-600">
            Your MCQ responses and audio recording have been securely submitted. Our team will review your application and get back to you soon.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const isAudioSection = currentQuestionIdx === questions.length;
  const currentQ = questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border mb-8 sticky top-4 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-primary-100 text-primary-700 font-medium px-3 py-1 rounded-full text-sm">
            {isAudioSection ? 'Audio Section' : `Question ${currentQuestionIdx + 1} of ${questions.length}`}
          </div>
          {warnings > 0 && (
            <span className="text-sm font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-md">
              <AlertCircle className="w-4 h-4" /> Warnings: {warnings}/3
            </span>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-2 font-mono text-xl font-semibold",
          timeLeft < 300 ? "text-red-600 animate-pulse" : "text-gray-900"
        )}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Main Content */}
      <Card className="w-full max-w-4xl min-h-[500px] flex flex-col">
        {isAudioSection ? (
          <div className="flex-1 p-8 flex flex-col">
            <h2 className="text-2xl font-bold mb-2">Final Step: Audio Recording</h2>
            <p className="text-gray-600 mb-8">
              Please record a 1-2 minute response to the following question. Ensure your microphone is working and you are in a quiet environment.
            </p>

            <div className="bg-primary-50 border border-primary-100 rounded-xl p-6 text-primary-900 font-medium text-lg mb-8 text-center">
              "How would you explain the concept of variables in programming to a 10-year-old?"
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <div className="w-full max-w-md bg-gray-50 border rounded-xl overflow-hidden shadow-inner h-32 relative">
                <canvas ref={canvasRef} className="w-full h-full" width={400} height={128} />
                {!isRecording && !audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm">
                    Waveform visualization will appear here
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    variant={audioUrl ? "outline" : "default"}
                    className={cn("gap-2 h-14 px-8 rounded-full", audioUrl ? "" : "bg-primary-600 hover:bg-primary-700")}
                  >
                    <Mic className="w-5 h-5" />
                    {audioUrl ? 'Re-record' : 'Start Recording'}
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2 h-14 px-8 rounded-full animate-pulse"
                  >
                    <Square className="w-5 h-5 fill-current" />
                    Stop Recording
                  </Button>
                )}

                {audioUrl && !isRecording && (
                  <Button
                    variant="secondary"
                    className="gap-2 h-14 px-8 rounded-full"
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      audio.play();
                    }}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Playback
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end pt-6 border-t">
              <Button
                onClick={handleComplete}
                disabled={!audioUrl || isRecording || isSubmitting}
                className="h-12 px-8 text-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-8 flex-1">
              <h3 className="text-xl font-semibold mb-8">{currentQ.questionText || currentQ.text}</h3>
              <div className="space-y-4">
                {currentQ.options.map((opt: string, idx: number) => (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50",
                      answers[currentQ.id] === idx ? "border-primary-500 bg-primary-50" : "border-gray-200"
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQ.id}`}
                      className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                      checked={answers[currentQ.id] === idx}
                      onChange={() => setAnswers({ ...answers, [currentQ.id]: idx })}
                    />
                    <span className="text-lg">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border-t p-6 flex justify-between items-center rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))}
                disabled={currentQuestionIdx === 0}
              >
                Previous
              </Button>
              <Button
                onClick={() => setCurrentQuestionIdx(i => i + 1)}
                disabled={answers[currentQ.id] === undefined}
              >
                {currentQuestionIdx === questions.length - 1 ? 'Proceed to Audio Section' : 'Next Question'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
