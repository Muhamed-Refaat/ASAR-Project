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
    <div className={cn("mx-4 mt-6 p-5 glass-panel text-center border border-primary/20 cyber-corners bg-surface-container/60 font-mono select-none crt-flicker", className)} id="individual-wheel-control-card">
      <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6">
        [ 4-WHEEL INDEPENDENT SPEED CONTROL ]
      </h3>

      {/* Chassis Layout */}
      <div className="relative max-w-[260px] mx-auto py-6 px-4 border border-primary/10 rounded-none bg-black/40 mb-6">
        <div className="absolute inset-x-6 top-1/2 h-0.5 border-t border-dashed border-primary/15 -translate-y-1/2 z-0" />
        <div className="absolute left-1/2 top-4 bottom-4 w-0.5 border-l border-dashed border-primary/15 -translate-x-1/2 z-0" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 relative z-10">
          {/* FL Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-2">FL_WHEEL</span>
            <div className="w-14 h-6 border border-primary bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center mb-3 glow-text-primary">
              {fl > 0 ? `+${fl}` : fl}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={fl}
              onChange={(e) => handleSpeedChange('fl', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container appearance-none cursor-pointer border border-primary/15"
            />
          </div>

          {/* FR Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-2">FR_WHEEL</span>
            <div className="w-14 h-6 border border-primary bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center mb-3 glow-text-primary">
              {fr > 0 ? `+${fr}` : fr}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={fr}
              onChange={(e) => handleSpeedChange('fr', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container appearance-none cursor-pointer border border-primary/15"
            />
          </div>

          {/* RL Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-2">RL_WHEEL</span>
            <div className="w-14 h-6 border border-primary bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center mb-3 glow-text-primary">
              {rl > 0 ? `+${rl}` : rl}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={rl}
              onChange={(e) => handleSpeedChange('rl', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container appearance-none cursor-pointer border border-primary/15"
            />
          </div>

          {/* RR Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] uppercase tracking-widest text-on-surface-variant mb-2">RR_WHEEL</span>
            <div className="w-14 h-6 border border-primary bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center mb-3 glow-text-primary">
              {rr > 0 ? `+${rr}` : rr}
            </div>
            <input
              type="range"
              min="-255"
              max="255"
              value={rr}
              onChange={(e) => handleSpeedChange('rr', parseInt(e.target.value))}
              disabled={!canControl}
              className="w-full accent-primary h-1 bg-surface-container appearance-none cursor-pointer border border-primary/15"
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
            "w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]",
            canControl
              ? "bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25 cursor-pointer"
              : "bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4 text-primary fill-primary" />
          APPLY INDEPENDENT SPEED VECTORS
        </button>
      </div>

      <div className="mt-4 text-[8px] text-on-surface-variant font-bold uppercase tracking-wider">
        * SLIDE DISPLACEMENT CHANNELS AND ENGAGE APPLY VECTORS *
      </div>
    </div>
  );
}
