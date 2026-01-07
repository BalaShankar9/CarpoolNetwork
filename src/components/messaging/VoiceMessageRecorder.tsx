import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';

interface VoiceMessageRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // seconds
  disabled?: boolean;
}

export function VoiceMessageRecorder({
  onRecordingComplete,
  maxDuration = 60,
  disabled = false
}: VoiceMessageRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioUrl(null);
    setDuration(0);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const sendRecording = () => {
    if (audioUrl && audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      onRecordingComplete(audioBlob, duration);
      cancelRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Not recording - show record button
  if (!isRecording && !audioUrl) {
    return (
      <button
        onClick={startRecording}
        disabled={disabled}
        className="p-3 bg-purple-500/20 rounded-full text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
        aria-label="Start voice recording"
      >
        <Mic className="w-5 h-5" />
      </button>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 bg-slate-700 rounded-full px-4 py-2"
      >
        {/* Cancel */}
        <button
          onClick={cancelRecording}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
          aria-label="Cancel recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Recording indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
          <span className="text-white font-mono text-sm min-w-[40px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1 bg-slate-600 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-500"
            style={{ width: `${(duration / maxDuration) * 100}%` }}
          />
        </div>

        {/* Pause/Resume */}
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        {/* Stop */}
        <button
          onClick={stopRecording}
          className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
          aria-label="Stop recording"
        >
          <Square className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  // Preview recorded audio
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 bg-slate-700 rounded-full px-4 py-2"
    >
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Cancel */}
      <button
        onClick={cancelRecording}
        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        aria-label="Delete recording"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={togglePlayback}
        className="p-2 bg-purple-500 rounded-full text-white hover:bg-purple-600 transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      {/* Duration */}
      <span className="text-white font-mono text-sm">
        {formatTime(duration)}
      </span>

      {/* Send */}
      <button
        onClick={sendRecording}
        className="p-2 bg-emerald-500 rounded-full text-white hover:bg-emerald-600 transition-colors"
        aria-label="Send voice message"
      >
        <Send className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default VoiceMessageRecorder;
