import { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Play } from 'lucide-react';

interface IndividualWheelControlProps {
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
  className?: string;
}

export default function IndividualWheelControl({
  sendCommand,
  robotReady,
  isLeader = true,
  manualLocked = false,
  className,
}: IndividualWheelControlProps) {
  const canControl = robotReady && isLeader && !manualLocked;

  const [fl, setFl] = useState(0);
  const [rl, setRl] = useState(0);
  const [fr, setFr] = useState(0);
  const [rr, setRr] = useState(0);

  const handleSpeedChange = (wheel: 'fl' | 'rl' | 'fr' | 'rr', value: number) => {
    if (wheel === 'fl') setFl(value);
    if (wheel === 'rl') setRl(value);
    if (wheel === 'fr') setFr(value);
    if (wheel === 'rr') setRr(value);
  };

  const handleApply = () => {
    if (!canControl) return;
    sendCommand(`WSPD:${fl}:${rl}:${fr}:${rr}`);
  };

  return (
    <div className={cn("mx-4 mt-6 p-6 rounded-2xl glass-panel text-center", className)} id="individual-wheel-control-card">
      <h3 className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
        4-Wheel Independent Speed Control
      </h3>

      {/* Chassis Layout */}
      <div className="relative max-w-[260px] mx-auto py-8 px-4 border border-outline-variant/30 rounded-3xl bg-surface-container-low/40 mb-6">
        <div className="absolute inset-x-6 top-1/2 h-0.5 border-t border-dashed border-outline-variant/30 -translate-y-1/2 z-0" />
        <div className="absolute left-1/2 top-4 bottom-4 w-0.5 border-l border-dashed border-outline-variant/30 -translate-x-1/2 z-0" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 relative z-10">
          {/* FL Wheel */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">Front Left</span>
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

          {/* FR Wheel */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">Front Right</span>
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

          {/* RL Wheel */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">Rear Left</span>
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

          {/* RR Wheel */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant mb-2">Rear Right</span>
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
      <div className="flex justify-center">
        <button
          onClick={handleApply}
          disabled={!canControl}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-sans text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md",
            canControl
              ? "bg-primary text-surface hover:brightness-110 active:brightness-95"
              : "bg-white/10 text-on-surface-variant cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4 text-surface fill-surface" />
          Apply Wheel Speeds
        </button>
      </div>

      <div className="mt-4 text-[8px] text-on-surface-variant font-mono">
        Slide right for forward, left for reverse. Click Apply Wheel Speeds to send command.
      </div>
    </div>
  );
}
