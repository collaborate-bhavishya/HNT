import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardDescription, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { AlertCircle, Clock, Mic, Square, Play, Pause, CheckCircle2, Volume2, BookOpen, Headphones } from 'lucide-react';

const EXAM_DURATION_SECONDS = 30 * 60; // 30 minutes

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
  const [topic, setTopic] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  // Timer state
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);

  // Anti-cheat state
  const [warnings, setWarnings] = useState(0);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(-1);
  const audioBlobRef = useRef<Blob | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

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
          if (data.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            setStarted(true);
          }
          if (data.topic) setTopic(data.topic);
          setTimeLeft(data.duration || EXAM_DURATION_SECONDS);
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

        canvasCtx.fillStyle = 'rgb(249, 250, 251)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(34, 197, 94)';
        canvasCtx.beginPath();

        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * canvas.height / 2;
          if (i === 0) canvasCtx.moveTo(x, y);
          else canvasCtx.lineTo(x, y);
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
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    }
  };

  const startAssessmentByTopic = async () => {
    if (!selectedTopic) return;
    setLoadingInitial(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/assessment/${token}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to start assessment');
      } else {
        setQuestions(data.questions);
        setTopic(selectedTopic);
        setStarted(true);
        setTimeLeft(data.duration || EXAM_DURATION_SECONDS);
      }
    } catch (err) {
      console.error(err);
      alert('Error starting assessment');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleComplete = async () => {
    const formData = new FormData();
    formData.append('timeTakenSeconds', String(EXAM_DURATION_SECONDS - timeLeft));
    formData.append('tabSwitchWarnings', String(warnings));
    formData.append('mcqAnswers', JSON.stringify(
      Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption
      }))
    ));

    if (audioBlobRef.current) {
      formData.append('audio', audioBlobRef.current, 'recording.webm');
    }

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

  // ===========================
  // VIEWS
  // ===========================

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center gap-4">
        <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-10 mb-4" />
        <div className="flex items-center gap-3 text-gray-600 font-medium">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading Assessment Securely...
        </div>
      </div>
    );
  }

  if (errorInitial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center gap-4">
        <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-10 mb-6" />
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-red-600 font-medium text-lg">{errorInitial}</p>
      </div>
    );
  }

  // Topic Selection View
  if (!started) {
    const topics = [
      { id: 'Python', icon: '🐍' },
      { id: 'C++', icon: '⚙️' },
      { id: 'Java', icon: '☕' },
      { id: 'SQL', icon: '📊' },
      { id: 'HTML & CSS', icon: '🎨' },
      { id: 'JavaScript', icon: '📜' }
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-8" />
            <span className="text-sm font-medium text-gray-500">Teacher Assessment Portal</span>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-10">
          <Card className="p-8 space-y-8 shadow-xl">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-3xl font-bold">Select Your Domain</CardTitle>
              <CardDescription className="text-lg">
                Choose the technology stack you want to be evaluated on.
              </CardDescription>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id)}
                  className={cn(
                    "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                    selectedTopic === t.id
                      ? "border-blue-500 bg-blue-50/50 shadow-md transform scale-105"
                      : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm"
                  )}
                >
                  <span className="text-4xl">{t.icon}</span>
                  <span className="font-bold text-gray-900">{t.id}</span>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t font-sans">
              <div className="bg-orange-50 rounded-xl p-4 flex gap-3 mb-6 border border-orange-100">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="text-sm text-orange-800 space-y-1">
                  <p className="font-bold uppercase tracking-wider text-xs">Guidelines</p>
                  <p>30 min duration • No tab switching • Microphone required</p>
                </div>
              </div>

              <Button
                className="w-full h-14 text-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl shadow-lg transition-all"
                onClick={startAssessmentByTopic}
                disabled={!selectedTopic || loadingInitial}
              >
                {loadingInitial ? 'Initializing...' : 'Start Assessment'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Completed View
  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
        <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-10 mb-8" />
        <Card className="w-full max-w-md text-center p-8 space-y-6 shadow-xl">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Assessment Submitted!</CardTitle>
          <CardDescription className="text-base text-gray-600">
            Your MCQ responses and audio recording have been securely submitted. Our team will review your application soon.
          </CardDescription>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            Keep an eye on your email for further updates.
          </div>
        </Card>
      </div>
    );
  }

  // Assessment In Progress View
  const isAudioSection = currentQuestionIdx === questions.length;
  const currentQ = questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center py-6 px-4">
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border mb-6 sticky top-4 z-10">
        <div className="flex items-center gap-3">
          <img src="/brightchamps-logo.svg" alt="BrightChamps" className="h-6 hidden sm:block" />
          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
          <div className={cn(
            "font-medium px-3 py-1 rounded-full text-sm",
            isAudioSection ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          )}>
            {isAudioSection ? '🎙️ Section 2: Audio Recording' : `📝 Section 1: Question ${currentQuestionIdx + 1} of ${questions.length}`}
          </div>
          {warnings > 0 && (
            <span className="text-sm font-medium text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> {warnings}/3
            </span>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-2 font-mono text-xl font-semibold px-3 py-1 rounded-full",
          timeLeft < 300 ? "text-red-600 bg-red-50 animate-pulse" : "text-gray-900 bg-gray-50"
        )}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-4xl mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAudioSection ? "bg-gradient-to-r from-purple-500 to-purple-600" : "bg-gradient-to-r from-blue-500 to-blue-600"
            )}
            style={{ width: `${isAudioSection ? 100 : ((currentQuestionIdx + 1) / (questions.length + 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <Card className="w-full max-w-4xl min-h-[500px] flex flex-col shadow-lg border-0">
        {isAudioSection ? (
          <div className="flex-1 p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Section 2</span>
                <h2 className="text-xl font-bold text-gray-900">Audio Recording</h2>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-purple-900 font-medium text-lg mb-8 text-center mt-6">
              <p className="text-sm text-purple-600 mb-2 font-bold uppercase tracking-wider">Spoken Assessment Topic</p>
              "How would you explain the concept of variables in programming to a 10-year-old?"
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <div className="w-full max-w-md bg-gray-50 border rounded-xl overflow-hidden shadow-inner h-32 relative">
                <canvas ref={canvasRef} className="w-full h-full" width={400} height={128} />
                {!isRecording && !audioUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium text-sm text-center px-4">
                    Waveform visualization will appear here during recording
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute inset-0 bg-purple-500/10 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-purple-600 font-medium">
                      <Volume2 className="w-5 h-5 animate-pulse" />
                      <span>Playing...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    variant={audioUrl ? "outline" : "default"}
                    className={cn("gap-2 h-14 px-8 rounded-full", audioUrl ? "" : "bg-purple-600 hover:bg-purple-700")}
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
                    variant={isPlaying ? "default" : "secondary"}
                    className={cn(
                      "gap-2 h-14 px-8 rounded-full transition-all",
                      isPlaying && "bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
                    )}
                    onClick={() => {
                      if (isPlaying && playbackAudioRef.current) {
                        playbackAudioRef.current.pause();
                        playbackAudioRef.current.currentTime = 0;
                        setIsPlaying(false);
                        return;
                      }
                      const audio = new Audio(audioUrl);
                      playbackAudioRef.current = audio;
                      setIsPlaying(true);
                      audio.onended = () => setIsPlaying(false);
                      audio.play();
                    }}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    {isPlaying ? 'Stop' : 'Playback'}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between items-center pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIdx(i => i - 1)}
              >
                ← Back to MCQs
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!audioUrl || isRecording || isSubmitting}
                className="h-12 px-8 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full"
              >
                {isSubmitting ? 'Submitting...' : '🚀 Submit Assessment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="p-6 pb-0 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Section 1: {topic}</span>
                <h2 className="text-lg font-bold text-gray-900">Question {currentQuestionIdx + 1} of {questions.length}</h2>
              </div>
            </div>

            <div className="p-8 pt-4 flex-1">
              <h3 className="text-xl font-semibold mb-8">{currentQ.questionText}</h3>
              <div className="grid gap-3">
                {currentQ.options.map((opt: string, idx: number) => (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-gray-50",
                      answers[currentQ.id] === idx ? "border-blue-500 bg-blue-50" : "border-gray-100"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all",
                      answers[currentQ.id] === idx ? "border-blue-500 bg-blue-500 text-white" : "border-gray-200 text-gray-400"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <input
                      type="radio"
                      name={`q-${currentQ.id}`}
                      className="sr-only"
                      checked={answers[currentQ.id] === idx}
                      onChange={() => setAnswers({ ...answers, [currentQ.id]: idx })}
                    />
                    <span className="text-lg">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-8 py-3 border-t bg-gray-50/50 flex items-center gap-1.5 flex-wrap">
              {questions.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={cn(
                    "w-8 h-8 rounded-full text-xs font-bold transition-all",
                    currentQuestionIdx === idx
                      ? "bg-blue-600 text-white shadow"
                      : answers[questions[idx].id] !== undefined
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  )}
                >
                  {idx + 1}
                </button>
              ))}
              <div className="ml-2 h-6 w-px bg-gray-300" />
              <button
                onClick={() => setCurrentQuestionIdx(questions.length)}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-bold transition-all flex items-center gap-1",
                  Object.keys(answers).length >= questions.length
                    ? "bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                <Mic className="w-3.5 h-3.5" /> Audio
              </button>
            </div>

            <div className="bg-white border-t p-5 flex justify-between items-center rounded-b-xl">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIdx(i => Math.max(0, i - 1))}
                disabled={currentQuestionIdx === 0}
              >
                ← Previous
              </Button>
              <Button
                onClick={() => {
                  if (currentQuestionIdx === questions.length - 1) {
                    setCurrentQuestionIdx(questions.length);
                  } else {
                    setCurrentQuestionIdx(i => i + 1);
                  }
                }}
                disabled={answers[currentQ.id] === undefined}
                className={cn(
                  currentQuestionIdx === questions.length - 1 && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                )}
              >
                {currentQuestionIdx === questions.length - 1 ? '🎙️ Proceed to Audio Section' : 'Next Question →'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
