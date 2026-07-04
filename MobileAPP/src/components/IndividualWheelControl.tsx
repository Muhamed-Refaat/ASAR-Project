import { useState, useRef, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface IndividualWheelControlProps {
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
}

export default function IndividualWheelControl({
  sendCommand,
  robotReady,
  isLeader = true,
  manualLocked = false,
}: IndividualWheelControlProps) {
  const canControl = robotReady && isLeader && !manualLocked;

  const [fl, setFl] = useState(0);
  const [rl, setRl] = useState(0);
  const [fr, setFr] = useState(0);
  const [rr, setRr] = useState(0);

  const lastSentRef = useRef<number>(0);
  const pendingSendRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send speeds to the robot, throttled to prevent network flooding
  const sendSpeedsThrottled = (speeds: { fl: number; rl: number; fr: number; rr: number }) => {
    if (!canControl) return;

    const now = Date.now();
    const cmd = `WSPD:${speeds.fl}:${speeds.rl}:${speeds.fr}:${speeds.rr}`;

    const send = () => {
      sendCommand(cmd);
      lastSentRef.current = Date.now();
      if (pendingSendRef.current) {
        clearTimeout(pendingSendRef.current);
        pendingSendRef.current = null;
      }
    };

    if (now - lastSentRef.current > 50) {
      send();
    } else {
      if (pendingSendRef.current) clearTimeout(pendingSendRef.current);
      pendingSendRef.current = setTimeout(send, 50 - (now - lastSentRef.current));
    }
  };

  const handleSpeedChange = (wheel: 'fl' | 'rl' | 'fr' | 'rr', value: number) => {
    let nextFl = fl;
    let nextRl = rl;
    let nextFr = fr;
    let nextRr = rr;

    if (wheel === 'fl') { setFl(value); nextFl = value; }
    if (wheel === 'rl') { setRl(value); nextRl = value; }
    if (wheel === 'fr') { setFr(value); nextFr = value; }
    if (wheel === 'rr') { setRr(value); nextRr = value; }

    sendSpeedsThrottled({ fl: nextFl, rl: nextRl, fr: nextFr, rr: nextRr });
  };

  const handleStopAll = () => {
    setFl(0);
    setRl(0);
    setFr(0);
    setRr(0);
    if (canControl) {
      sendCommand('STOP');
    }
  };

  const handleZeroAll = () => {
    setFl(0);
    setRl(0);
    setFr(0);
    setRr(0);
    sendSpeedsThrottled({ fl: 0, rl: 0, fr: 0, rr: 0 });
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (pendingSendRef.current) clearTimeout(pendingSendRef.current);
    };
  }, []);

  return (
    <div className="mx-4 mt-6 p-6 rounded-2xl glass-panel text-center" id="individual-wheel-control-card">
      <h3 className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
        4-Wheel Independent Speed Control
      </h3>

      {/* Chassis Layout */}
      <div className="relative max-w-[260px] mx-auto py-8 px-4 border border-outline-variant/30 rounded-3xl bg-surface-container-low/40 mb-6">
        {/* Rear Axle / Center Chassis Line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 border-t border-dashed border-outline-variant/30 -translate-y-1/2 z-0" />
        <div className="absolute left-1/2 top-4 bottom-4 w-0.5 border-l border-dashed border-outline-variant/30 -translate-x-1/2 z-0" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 relative z-10">
          {/* FRONT LEFT WHEEL */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[8px] font-bold text-on-surface-variant uppercase mb-1">Front Left (FL)</span>
            <div className="w-12 h-6 rounded bg-primary/80 border border-primary text-surface font-mono text-[9px] font-bold flex items-center justify-center mb-3">
              {fl > 0 ? `+${fl}` : fl}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={fl}
              onChange={(e) => handleSpeedChange('fl', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* FRONT RIGHT WHEEL */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[8px] font-bold text-on-surface-variant uppercase mb-1">Front Right (FR)</span>
            <div className="w-12 h-6 rounded bg-primary/80 border border-primary text-surface font-mono text-[9px] font-bold flex items-center justify-center mb-3">
              {fr > 0 ? `+${fr}` : fr}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={fr}
              onChange={(e) => handleSpeedChange('fr', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* REAR LEFT WHEEL */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[8px] font-bold text-on-surface-variant uppercase mb-1">Rear Left (RL)</span>
            <div className="w-12 h-6 rounded bg-primary/80 border border-primary text-surface font-mono text-[9px] font-bold flex items-center justify-center mb-3">
              {rl > 0 ? `+${rl}` : rl}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={rl}
              onChange={(e) => handleSpeedChange('rl', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* REAR RIGHT WHEEL */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[8px] font-bold text-on-surface-variant uppercase mb-1">Rear Right (RR)</span>
            <div className="w-12 h-6 rounded bg-primary/80 border border-primary text-surface font-mono text-[9px] font-bold flex items-center justify-center mb-3">
              {rr > 0 ? `+${rr}` : rr}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={rr}
              onChange={(e) => handleSpeedChange('rr', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleZeroAll}
          disabled={!canControl}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-outline-variant/40",
            canControl
              ? "bg-surface-container-high hover:bg-surface-container-highest text-on-surface"
              : "opacity-40 cursor-not-allowed text-on-surface/40"
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Zero Speed
        </button>

        <button
          onClick={handleStopAll}
          disabled={!canControl}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border",
            canControl
              ? "bg-error/15 border-error/40 hover:bg-error/25 text-error active:bg-error/35"
              : "opacity-40 border-outline-variant/20 text-on-surface/40 cursor-not-allowed"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          STOP ALL
        </button>
      </div>

      <div className="mt-4 text-[8px] text-on-surface-variant font-mono">
        Configure speeds individually. Slide right for forward, left for reverse.
      </div>
    </div>
  );
}
