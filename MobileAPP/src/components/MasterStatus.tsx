import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface MasterStatusProps {
  connected: boolean;
  robotReady: boolean;
  lastError: string;
}

export default function MasterStatus({ connected, robotReady, lastError }: MasterStatusProps) {
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const prevStateRef = useRef<{ connected: boolean; robotReady: boolean; lastError: string } | null>(null);

  useEffect(() => {
    if (!prevStateRef.current) {
      prevStateRef.current = { connected, robotReady, lastError };
      return;
    }

    const prev = prevStateRef.current;
    if (prev.connected !== connected || prev.robotReady !== robotReady || prev.lastError !== lastError) {
      setLastEventAt(Date.now());
      setSecondsAgo(0);
      prevStateRef.current = { connected, robotReady, lastError };
    }
  }, [connected, robotReady, lastError]);

  useEffect(() => {
    if (!lastEventAt) return;
    const timer = window.setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastEventAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lastEventAt]);

  const hasError = lastError.trim().length > 0;
  
  // Status state config mapping
  const config = useMemo(() => {
    if (hasError) {
      return {
        text: `FAULT: ${lastError}`,
        colorClass: 'text-error glow-text-error',
        borderClass: 'border-error/30',
        cornerClass: 'cyber-corners-error',
        bgGlow: 'bg-error/5',
      };
    }
    if (connected && robotReady) {
      return {
        text: 'SYS_READY',
        colorClass: 'text-secondary glow-text-secondary',
        borderClass: 'border-secondary/30',
        cornerClass: 'cyber-corners-secondary',
        bgGlow: 'bg-secondary/5',
      };
    }
    if (connected) {
      return {
        text: 'COM_LINKING',
        colorClass: 'text-primary glow-text-primary',
        borderClass: 'border-primary/30',
        cornerClass: 'cyber-corners',
        bgGlow: 'bg-primary/5',
      };
    }
    return {
      text: 'SYS_OFFLINE',
      colorClass: 'text-error glow-text-error',
      borderClass: 'border-error/20',
      cornerClass: 'cyber-corners-error',
      bgGlow: 'bg-error/2',
    };
  }, [connected, robotReady, lastError, hasError]);

  const segmentClasses = useMemo(() => {
    if (connected && robotReady) return ['bg-secondary glow-secondary', 'bg-secondary glow-secondary', 'bg-secondary glow-secondary'];
    if (connected && !robotReady) return ['bg-primary glow-primary', 'bg-white/5', 'bg-white/5'];
    return ['bg-white/5', 'bg-white/5', 'bg-white/5'];
  }, [connected, robotReady]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`mx-4 mt-6 p-5 glass-panel border ${config.borderClass} ${config.cornerClass} ${config.bgGlow} relative overflow-hidden font-mono`}
      id="status-banner"
    >
      {/* Decorative grid element */}
      <div className="absolute top-0 right-0 p-1 text-[8px] text-primary/10 select-none pointer-events-none">
        0x00F0FF // ASAR_OS_BUFF
      </div>

      <div className="flex justify-between items-start mb-5">
        <span className="text-[10px] font-bold text-primary tracking-widest uppercase glow-text-primary">
          [ STATE_SUPERVISOR ]
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary/15 border border-secondary/30">
          <div className="w-1.5 h-1.5 bg-secondary rounded-none animate-pulse" />
          <span className="text-[8px] font-bold text-secondary uppercase tracking-wider">TELEMETRY_FEED</span>
        </div>
      </div>

      <div className="mb-1">
        <h2 className={`text-2xl font-black tracking-widest uppercase ${config.colorClass} truncate`} id="status-text">
          {config.text}
        </h2>
        <p className="text-[9px] text-on-surface-variant tracking-wider uppercase mt-1.5">
          {lastEventAt ? `LAST STATE EVENT_LOG: ${secondsAgo} SEC AGO` : 'NO PREVIOUS STATE TRANSTIONS'}
        </p>
      </div>

      <div className="flex gap-1.5 mt-5 h-1 w-full bg-white/5">
        {segmentClasses.map((segmentClass, index) => (
          <div key={index} className={`h-full w-1/3 transition-all duration-300 ${segmentClass}`} />
        ))}
      </div>
    </motion.div>
  );
}
