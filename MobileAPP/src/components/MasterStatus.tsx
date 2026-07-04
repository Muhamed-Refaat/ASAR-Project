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
  const statusText = hasError ? `Error: ${lastError}` : connected && robotReady ? 'System Ready' : connected ? 'Connecting...' : 'Offline';
  const statusColor = hasError ? 'text-error' : connected && robotReady ? 'text-secondary' : connected ? 'text-primary' : 'text-error';

  const segmentClasses = useMemo(() => {
    if (connected && robotReady) return ['bg-secondary', 'bg-secondary', 'bg-secondary'];
    if (connected && !robotReady) return ['bg-primary', 'bg-white/10', 'bg-white/10'];
    return ['bg-white/10', 'bg-white/10', 'bg-white/10'];
  }, [connected, robotReady]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-6 p-6 rounded-2xl glass-panel relative overflow-hidden"
      id="status-banner"
    >
      <div className="flex justify-between items-start mb-6">
        <span className="font-mono text-xs font-bold text-secondary tracking-widest uppercase">Master Status</span>
        <div className="flex items-center gap-2 px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full">
          <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
          <span className="font-mono text-[10px] font-bold text-secondary uppercase">Live Telemetry</span>
        </div>
      </div>

      <div className="mb-2">
        <h2 className={`font-sans text-4xl font-bold tracking-tight uppercase ${statusColor}`} id="status-text">{statusText}</h2>
        <p className="font-mono text-sm text-on-surface-variant mt-1">
          {lastEventAt ? `Last event: ${secondsAgo}s ago` : 'No events yet'}
        </p>
      </div>

      <div className="flex gap-1 mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        {segmentClasses.map((segmentClass, index) => (
          <div key={index} className={`h-full w-1/3 rounded-full ${segmentClass}`} />
        ))}
      </div>
    </motion.div>
  );
}
