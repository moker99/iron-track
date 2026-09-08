import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, X, Volume2, VolumeX, Timer } from 'lucide-react';
import { playTimerBeep } from '../utils/audio';

interface RestTimerWidgetProps {
  initialSeconds: number;
  onClose: () => void;
}

export const RestTimerWidget: React.FC<RestTimerWidgetProps> = ({
  initialSeconds,
  onClose,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    setTimeLeft(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (soundEnabled) {
          if (next === 3 || next === 2 || next === 1) {
            playTimerBeep(false);
          } else if (next === 0) {
            playTimerBeep(true);
          }
        }
        if (next <= 0) {
          setIsRunning(false);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, soundEnabled]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const addTime = (secs: number) => {
    setTimeLeft(prev => prev + secs);
  };

  const resetTimer = () => {
    setTimeLeft(initialSeconds);
    setIsRunning(true);
  };

  return (
    <div className="rest-timer-widget">
      <div className="flex items-center gap-2">
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: timeLeft === 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0, 245, 155, 0.15)',
          border: `2px solid ${timeLeft === 0 ? 'var(--neon-rose)' : 'var(--neon-green)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: timeLeft === 0 ? 'var(--neon-rose)' : 'var(--neon-green)',
        }}>
          <Timer size={18} />
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>組間休息</div>
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: timeLeft === 0 ? 'var(--neon-rose)' : 'var(--text-main)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.1
          }}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="btn btn-secondary btn-icon btn-sm"
          title={isRunning ? '暫停' : '繼續'}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          className="btn btn-secondary btn-icon btn-sm"
          title="重設"
          onClick={resetTimer}
        >
          <RotateCcw size={14} />
        </button>

        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          title="加 30 秒"
          onClick={() => addTime(30)}
        >
          +30s
        </button>

        <button
          className="btn btn-ghost btn-icon btn-sm"
          title={soundEnabled ? '音效開啟' : '靜音'}
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{ color: soundEnabled ? 'var(--neon-green)' : 'var(--text-dim)', background: 'transparent' }}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        <button
          className="btn btn-ghost btn-icon btn-sm"
          title="關閉計時器"
          onClick={onClose}
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
