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
  const disabledClass = !canControl ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer';

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
    <div className="flex items-center gap-3 px-4 mt-4 font-mono select-none crt-flicker" id="mode-controls">
      {/* Dynamic Mode Switcher */}
      <div className="flex-1 glass-panel p-1 rounded-none border border-primary/20 flex items-center relative cyber-corners">
        <button
          onClick={() => handleModeChange('manual')}
          disabled={!isLeader}
          className={cn(
            "flex-1 py-2.5 rounded-none font-mono text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
            !autopilotEnabled 
              ? "bg-secondary/15 border border-secondary text-secondary glow-text-secondary" 
              : "text-on-surface-variant hover:text-on-surface hover:bg-white/5",
            !isLeader && "opacity-40 cursor-not-allowed"
          )}
          id="manual-btn"
        >
          MANUAL
        </button>
        <button
          onClick={() => handleModeChange('autopilot')}
          disabled={!isLeader}
          className={cn(
            "flex-1 py-2.5 rounded-none font-mono text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]",
            autopilotEnabled 
              ? "bg-secondary/15 border border-secondary text-secondary glow-text-secondary" 
              : "text-on-surface-variant hover:text-on-surface hover:bg-white/5",
            !isLeader && "opacity-40 cursor-not-allowed"
          )}
          id="autopilot-btn"
        >
          AUTOPILOT
        </button>
      </div>

      {/* Alignment Tracker */}
      <motion.button
        whileTap={canControl ? { scale: 0.92 } : {}}
        onClick={handleAlign}
        disabled={!canControl}
        className={cn(
          "w-12 h-12 glass-panel flex flex-col items-center justify-center rounded-none border border-primary/20 hover:border-primary/50 transition-all", 
          disabledClass
        )}
        id="align-btn"
        title="Align Wheels"
      >
        <Target className="w-5 h-5 text-primary glow-text-primary" />
        <span className="text-[7px] font-black text-primary uppercase tracking-wider mt-0.5">ALIGN</span>
      </motion.button>

      {/* ESTOP Emergency Stop Trigger */}
      <motion.button
        whileTap={canControl ? { scale: 0.95 } : {}}
        onClick={handleStop}
        disabled={!canControl}
        className={cn(
          "w-16 h-16 bg-error/15 border-2 border-error flex flex-col items-center justify-center rounded-none transition-all relative select-none", 
          canControl ? "hover:bg-error/25 glow-error" : "opacity-40 cursor-not-allowed"
        )}
        id="stop-btn"
      >
        {/* Absolute Red Brackets */}
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l border-error" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r border-error" />
        
        <Ban className="w-6 h-6 text-error glow-text-error animate-pulse" />
        <span className="text-[9px] font-black text-error uppercase tracking-widest mt-1 glow-text-error">ESTOP</span>
      </motion.button>

      {/* local buzzer signal horn */}
      <motion.button
        whileTap={canControl ? { scale: 0.92 } : {}}
        onClick={handleHorn}
        disabled={!canControl}
        className={cn(
          "w-10 h-10 glass-panel flex flex-col items-center justify-center rounded-none border border-primary/20 hover:border-primary/40 transition-all", 
          disabledClass
        )}
        id="horn-btn"
        title="Signal Horn"
      >
        <Volume2 className="w-4 h-4 text-primary glow-text-primary" />
        <span className="text-[6px] font-black text-primary uppercase mt-0.5 tracking-wider">HORN</span>
      </motion.button>
    </div>
  );
}
