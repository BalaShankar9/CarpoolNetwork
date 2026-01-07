import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoiceMessagePlayerProps {
    audioUrl: string;
    duration: number;
    senderName: string;
    isOwn: boolean;
}

export function VoiceMessagePlayer({
    audioUrl,
    duration,
    senderName,
    isOwn
}: VoiceMessagePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const cyclePlaybackRate = () => {
        if (!audioRef.current) return;
        const rates = [1, 1.5, 2];
        const currentIndex = rates.indexOf(playbackRate);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        audioRef.current.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = clickPosition * duration;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Generate waveform bars (simulated)
    const waveformBars = Array.from({ length: 30 }, () =>
        Math.random() * 0.6 + 0.4
    );

    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-2xl max-w-xs ${isOwn
                    ? 'bg-emerald-500/20'
                    : 'bg-slate-700/50'
                }`}
        >
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`p-2.5 rounded-full flex-shrink-0 ${isOwn
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    } transition-colors`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Waveform & Progress */}
            <div className="flex-1">
                <div
                    ref={progressRef}
                    onClick={handleProgressClick}
                    className="h-8 flex items-center gap-0.5 cursor-pointer"
                >
                    {waveformBars.map((height, index) => {
                        const barProgress = (index / waveformBars.length) * 100;
                        const isActive = barProgress <= progress;

                        return (
                            <motion.div
                                key={index}
                                className={`w-1 rounded-full transition-colors ${isActive
                                        ? isOwn ? 'bg-emerald-400' : 'bg-purple-400'
                                        : 'bg-slate-500'
                                    }`}
                                style={{ height: `${height * 100}%` }}
                                initial={false}
                                animate={{
                                    scaleY: isPlaying && isActive ? [1, 1.2, 1] : 1
                                }}
                                transition={{
                                    duration: 0.3,
                                    repeat: isPlaying && isActive ? Infinity : 0,
                                    delay: index * 0.02
                                }}
                            />
                        );
                    })}
                </div>

                {/* Time Display */}
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400 font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Playback Rate */}
                        <button
                            onClick={cyclePlaybackRate}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            {playbackRate}x
                        </button>

                        {/* Mute Toggle */}
                        <button
                            onClick={toggleMute}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VoiceMessagePlayer;
