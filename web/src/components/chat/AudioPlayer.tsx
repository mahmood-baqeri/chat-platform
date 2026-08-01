import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Volume2, Trash2 } from "lucide-react";
import { Attachment } from "../../types";

interface AudioPlayerProps {
  attachment: Attachment;
  isMe?: boolean;
  onDelete?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ attachment, isMe, onDelete }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isBuffering, setIsBuffering] = useState(false);

  // Generate deterministic waveform heights based on file name or URL
  const waveformBars = useRef<number[]>(
    Array.from({ length: 28 }, (_, i) => {
      const seed = (attachment.id.charCodeAt(i % attachment.id.length) || 50) + i * 13;
      return 20 + (seed % 75);
    })
  ).current;

  useEffect(() => {
    const audio = new Audio(attachment.url);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
      setIsBuffering(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
    };
  }, [attachment.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
        });
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleBarClick = (index: number) => {
    const targetTime = (index / waveformBars.length) * (duration || 1);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const fileSizeKB = attachment.size ? (attachment.size / 1024).toFixed(0) : null;
  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className={`p-3 rounded-2xl border flex flex-col gap-2.5 min-w-[260px] max-w-xs transition-all relative ${
        isPlaying ? "shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/50" : ""
      } ${
        isMe
          ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 border-white/20 text-white"
          : "bg-gradient-to-r from-slate-800/95 to-slate-900/95 border-white/10 text-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isMe
              ? "bg-white text-blue-600 hover:bg-slate-100"
              : "bg-blue-500 text-white hover:bg-blue-400"
          }`}
          title={isPlaying ? "توقف" : "پخش"}
        >
          {isBuffering ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform & Time */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Header Row */}
          <div className="flex items-center justify-between text-[10px] font-mono opacity-90">
            <span className="truncate max-w-[120px] font-bold">{attachment.name || "پیام صوتی"}</span>
            <span className="shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          {/* Telegram Waveform Bars */}
          <div className="flex items-center gap-[2px] h-7 cursor-pointer pt-1" title="برای پرش کلیک کنید">
            {waveformBars.map((barHeight, idx) => {
              const isPassed = idx / waveformBars.length <= progressRatio;
              return (
                <div
                  key={idx}
                  onClick={() => handleBarClick(idx)}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPassed
                      ? isMe ? "bg-white" : "bg-blue-400"
                      : isMe ? "bg-white/30 hover:bg-white/50" : "bg-white/20 hover:bg-white/40"
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Controls & Speed Toggle */}
      <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[10px] opacity-80">
        <div className="flex items-center gap-2">
          {/* Speed Toggle Button */}
          <button
            onClick={toggleSpeed}
            className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 font-bold font-mono text-[10px] text-blue-200 transition-colors"
            title="تغییر سرعت پخش"
          >
            {playbackSpeed}x
          </button>
          <span className="font-mono">{fileSizeKB ? `${fileSizeKB} KB` : "صوتی"}</span>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={attachment.url}
            download={attachment.name || "voice_message.webm"}
            className="hover:text-blue-200 transition-colors flex items-center gap-1"
            title="دانلود فایل صوتی"
          >
            <Download className="w-3 h-3" />
            <span>دانلود</span>
          </a>

          {onDelete && (
            <button
              onClick={onDelete}
              className="hover:text-rose-300 transition-colors flex items-center gap-1"
              title="حذف"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
