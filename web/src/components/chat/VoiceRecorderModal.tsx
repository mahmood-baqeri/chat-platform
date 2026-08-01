import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Play,
  Pause,
  Send,
  Trash2,
  X,
  AlertCircle
} from "lucide-react";

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendAudio: (audioBlob: Blob, duration: number, sizeBytes: number, caption?: string) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendAudio,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioSizeBytes, setAudioSizeBytes] = useState(0);
  const [caption, setCaption] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Visualizer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCaption("");
      setRecordingTime(0);
      setAudioSizeBytes(0);
      setAudioUrl(null);
      startRecording();
    } else {
      stopAndCleanup();
    }
    return () => stopAndCleanup();
  }, [isOpen]);

  const getSupportedMimeType = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/ogg;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("مرورگر شما از قابلیت ضبط صدا پشتیبانی نمی‌کند");
      }

      // Do not force hardware sampleRate constraint to avoid speed/pitch stretching mismatches
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        audioBlobRef.current = blob;
        setAudioSizeBytes(blob.size);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;
          drawWaveform();
        }
      } catch (ctxErr) {
        console.warn("Waveform audio context warning:", ctxErr);
      }

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      console.error("Microphone access error:", e);
      setErrorMessage(
        e.message || "دسترسی به میکروفون تایید نشد."
      );
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(3, (dataArray[i] / 255) * canvas.height * 0.9);
        ctx.fillStyle = isPaused ? "#f59e0b" : "#3b82f6";
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  const togglePauseResume = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  };

  const stopAndCleanup = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setIsPreviewPlaying(false);
    setAudioUrl(null);
    setErrorMessage(null);
  };

  const togglePreviewPlay = () => {
    if (!audioUrl) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewPlaying(false);
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(console.error);
    }
  };

  const handleSendFinal = () => {
    const trimmedCaption = caption.trim();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        const finalMime = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: finalMime });
        if (blob.size > 0) {
          onSendAudio(blob, recordingTime || 1, blob.size, trimmedCaption);
        }
        stopAndCleanup();
        onClose();
      };
      stopRecording();
    } else if (audioBlobRef.current) {
      onSendAudio(audioBlobRef.current, recordingTime || 1, audioBlobRef.current.size, trimmedCaption);
      stopAndCleanup();
      onClose();
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="w-full z-40 bg-[var(--sidebar)] border border-blue-500/30 rounded-2xl px-3 py-2 shadow-xl backdrop-blur-xl max-h-[70px] h-[66px] flex items-center justify-between gap-2 text-[var(--text-primary)] max-w-3xl mx-auto my-1 flex-nowrap overflow-x-auto">
      {errorMessage ? (
        <div className="flex items-center gap-2 text-rose-500 text-xs w-full justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          {/* 🎤 Icon & Waveform */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
              <Mic className={`w-4 h-4 ${isRecording && !isPaused ? "animate-pulse text-rose-500" : ""}`} />
            </div>
            <div className="w-20 sm:w-28 h-7 flex items-center shrink-0 bg-[var(--list)] border border-[var(--border)] rounded-lg px-1">
              <canvas ref={canvasRef} width={100} height={28} className="w-full h-full" />
            </div>
          </div>

          {/* Timer */}
          <div className="font-mono text-xs font-bold text-blue-500 shrink-0 px-1">
            {formatTimer(recordingTime)}
          </div>

          {/* Caption Input */}
          <div className="flex-1 min-w-[80px] max-w-xs shrink">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="توضیحات..."
              className="w-full bg-[var(--list)] border border-[var(--border)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-blue-500 text-right truncate"
            />
          </div>

          {/* Controls: Cancel | Pause | Preview | Send */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cancel */}
            <button
              type="button"
              onClick={() => {
                stopAndCleanup();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="لغو"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Pause / Resume */}
            {isRecording && (
              <button
                type="button"
                onClick={togglePauseResume}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isPaused
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
                title={isPaused ? "ادامه" : "مکث"}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              </button>
            )}

            {/* Preview */}
            {audioUrl && (
              <button
                type="button"
                onClick={togglePreviewPlay}
                className="p-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/30 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="پخش پیش‌نمایش"
              >
                {isPreviewPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            )}

            {/* Send */}
            <button
              type="button"
              onClick={handleSendFinal}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="ارسال"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span className="hidden sm:inline">ارسال</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
