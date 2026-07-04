import { Ban, Volume2, Target } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';

interface ControlSwitchProps {
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  autopilotEnabled?: boolean;
}

export default function ControlSwitch({ sendCommand, robotReady, isLeader = true, autopilotEnabled = false }: ControlSwitchProps) {
  const canControl = robotReady && isLeader;
  const disabledClass = !canControl ? 'opacity-50 cursor-not-allowed' : '';

  const handleModeChange = (nextMode: 'manual' | 'autopilot') => {
    if (!isLeader) return;
    sendCommand(nextMode === 'autopilot' ? 'AUTO_ON' : 'AUTO_OFF');
  };

  const handleStop = () => {
    if (!canControl) return;
    sendCommand('STOP');
  };

  const handleHorn = () => {
    if (!canControl) return;
    sendCommand('HORN');
  };

  const handleAlign = () => {
    if (!canControl) return;
    sendCommand('ALIGN');
  };

  return (
    <div className="flex items-center gap-3 px-4 mt-4" id="mode-controls">
      <div className="flex-1 glass-panel p-1 rounded-xl flex items-center">
        <button
          onClick={() => handleModeChange('manual')}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-sans text-xs font-bold uppercase transition-all",
            !autopilotEnabled ? "bg-secondary text-surface" : "text-on-surface-variant hover:text-on-surface"
          )}
          id="manual-btn"
        >
          Manual
        </button>
        <button
          onClick={() => handleModeChange('autopilot')}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-sans text-xs font-bold uppercase transition-all",
            autopilotEnabled ? "bg-secondary text-surface" : "text-on-surface-variant hover:text-on-surface"
          )}
          id="autopilot-btn"
        >
          Auto
        </button>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleAlign}
        disabled={!canControl}
        className={cn("w-12 h-12 glass-panel flex flex-col items-center justify-center rounded-xl border border-primary/20 hover:border-primary/50 transition-colors", disabledClass)}
        id="align-btn"
      >
        <Target className="w-5 h-5 text-primary" />
        <span className="font-sans text-[8px] font-bold text-primary uppercase mt-0.5">Align</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleStop}
        disabled={!canControl}
        className={cn("w-16 h-16 bg-error flex flex-col items-center justify-center rounded-xl glow-error", disabledClass)}
        id="stop-btn"
      >
        <Ban className="w-6 h-6 text-surface" />
        <span className="font-sans text-[10px] font-black text-surface uppercase mt-1">Stop</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onMouseDown={handleHorn}
        onTouchStart={handleHorn}
        disabled={!canControl}
        className={cn("w-10 h-10 glass-panel flex flex-col items-center justify-center rounded-xl", disabledClass)}
        id="horn-btn"
      >
        <Volume2 className="w-4 h-4 text-on-surface" />
      </motion.button>
    </div>
  );
}
