import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, RotateCw } from 'lucide-react';

interface ButtonControlProps {
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
}

export default function ButtonControl({
  sendCommand,
  robotReady,
  isLeader = true,
  manualLocked = false,
}: ButtonControlProps) {
  const canControl = robotReady && isLeader && !manualLocked;

  const directionMap: Record<string, { left: number; right: number; label: string }> = {
    'up': { left: 200, right: 200, label: 'FWD' },
    'up-left': { left: 100, right: 200, label: 'FWD_L' },
    'up-right': { left: 200, right: 100, label: 'FWD_R' },
    'left': { left: -150, right: 150, label: 'TRN_L' },
    'right': { left: 150, right: -150, label: 'TRN_R' },
    'down': { left: -180, right: -180, label: 'REV' },
    'down-left': { left: -200, right: -100, label: 'REV_L' },
    'down-right': { left: -100, right: -200, label: 'REV_R' },
    'rotate-left': { left: -200, right: 200, label: 'ROT_L' },
    'rotate-right': { left: 200, right: -200, label: 'ROT_R' },
  };

  const handleButtonPress = (direction: string) => {
    if (!canControl) return;
    const cmd = directionMap[direction];
    if (cmd) {
      sendCommand(`SPD:${cmd.left}:${cmd.right}`);
    }
  };

  const handleButtonRelease = () => {
    if (!canControl) return;
    sendCommand('STOP');
  };

  const buttonClass = (direction: string) =>
    cn(
      'w-14 h-14 border flex items-center justify-center transition-all font-mono text-[9px] font-black uppercase select-none',
      canControl
        ? 'border-primary/20 bg-primary/5 hover:bg-primary/15 active:bg-primary/25 text-primary hover:border-primary cursor-pointer'
        : 'border-white/5 bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed opacity-40',
    );

  return (
    <div className="mx-4 mt-6 p-5 glass-panel border border-primary/20 cyber-corners bg-surface-container/60 font-mono select-none" id="button-control-card">
      <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6 text-center">
        [ STEP CONTROL MATRIX ]
      </h3>

      <div className="flex flex-col items-center gap-3 w-fit mx-auto">
        {/* Row 1: Up-Left, Up, Up-Right */}
        <div className="flex gap-3 justify-center">
          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('up-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('up-left')}
            title="Forward-Left"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">FWD_L</span>
              <div className="flex">
                <ChevronUp className="w-3.5 h-3.5 -mr-1" />
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('up')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('up')}
            title="Forward"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">FWD</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('up-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('up-right')}
            title="Forward-Right"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">FWD_R</span>
              <div className="flex">
                <ChevronUp className="w-3.5 h-3.5 -mr-1" />
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Row 2: Left, Stop, Right */}
        <div className="flex gap-3 justify-center">
          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('left')}
            title="Turn Left"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">TRN_L</span>
              <ChevronLeft className="w-4 h-4" />
            </div>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerUp={handleButtonRelease}
            disabled={!canControl}
            className={cn(
              'w-14 h-14 border flex flex-col items-center justify-center transition-all font-mono text-[9px] font-black uppercase select-none',
              canControl
                ? 'border-error/40 bg-error/10 text-error hover:bg-error/20 active:bg-error/30 hover:border-error cursor-pointer glow-error'
                : 'border-white/5 bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed opacity-40',
            )}
            title="Stop"
          >
            <span className="text-[6px] mb-0.5 text-error/60 font-bold">ESTOP</span>
            <span className="text-[10px] font-extrabold text-error">STOP</span>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('right')}
            title="Turn Right"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">TRN_R</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        </div>

        {/* Row 3: Down-Left, Down, Down-Right */}
        <div className="flex gap-3 justify-center">
          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('down-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('down-left')}
            title="Backward-Left"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">REV_L</span>
              <div className="flex">
                <ChevronDown className="w-3.5 h-3.5 -mr-1" />
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('down')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('down')}
            title="Backward"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">REV</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </motion.button>

          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('down-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('down-right')}
            title="Backward-Right"
          >
            <div className="flex flex-col items-center">
              <span className="text-[7px] mb-0.5">REV_R</span>
              <div className="flex">
                <ChevronDown className="w-3.5 h-3.5 -mr-1" />
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* New Row for Rotate Buttons */}
        <div className="flex gap-3 justify-center mt-2">
          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('rotate-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('rotate-left'), 'w-21')}
            title="Rotate Left"
          >
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5 text-primary" />
              <span>ROT_L</span>
            </div>
          </motion.button>
          <motion.button
            whileTap={canControl ? { scale: 0.95 } : {}}
            onPointerDown={() => handleButtonPress('rotate-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('rotate-right'), 'w-21')}
            title="Rotate Right"
          >
            <div className="flex items-center gap-1">
              <span>ROT_R</span>
              <RotateCw className="w-3.5 h-3.5 text-primary" />
            </div>
          </motion.button>
        </div>
      </div>

      <div className="mt-5 text-[8px] text-on-surface-variant font-bold text-center uppercase tracking-wider">
        * PRESS_HOLD CHANNELS TO ENGAGE MOTORS *
      </div>
    </div>
  );
}
