import { cn } from '@/src/lib/utils';
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
    'up': { left: 200, right: 200, label: 'Forward' },
    'up-left': { left: 100, right: 200, label: 'Forward\nLeft' },
    'up-right': { left: 200, right: 100, label: 'Forward\nRight' },
    'left': { left: -150, right: 150, label: 'Turn\nLeft' },
    'right': { left: 150, right: -150, label: 'Turn\nRight' },
    'down': { left: -180, right: -180, label: 'Backward' },
    'down-left': { left: -200, right: -100, label: 'Back\nLeft' },
    'down-right': { left: -100, right: -200, label: 'Back\nRight' },
    'rotate-left': { left: -200, right: 200, label: 'Rotate\nLeft' },
    'rotate-right': { left: 200, right: -200, label: 'Rotate\nRight' },
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
      'p-2 rounded-xl transition-all font-mono text-[8px] font-bold uppercase tracking-widest',
      'border border-primary/30 hover:border-primary/60',
      canControl
        ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer active:bg-primary/30'
        : 'bg-surface-container-high opacity-50 cursor-not-allowed',
    );

  return (
    <div className="mx-4 mt-6 p-6 rounded-2xl glass-panel text-center" id="button-control-card">
      <h3 className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-8">
        Directional Control
      </h3>

      <div className="flex flex-col items-center gap-2 w-fit mx-auto">
        {/* Row 1: Up-Left, Up, Up-Right */}
        <div className="flex gap-2 justify-center">
          <button
            onPointerDown={() => handleButtonPress('up-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('up-left')}
            title="Forward-Left"
          >
            <div className="flex items-center gap-1">
              <ChevronUp className="w-3 h-3" />
              <ChevronLeft className="w-3 h-3" />
            </div>
          </button>

          <button
            onPointerDown={() => handleButtonPress('up')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('up'), 'w-12 h-12')}
            title="Forward"
          >
            <ChevronUp className="w-4 h-4 mx-auto" />
          </button>

          <button
            onPointerDown={() => handleButtonPress('up-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('up-right')}
            title="Forward-Right"
          >
            <div className="flex items-center gap-1">
              <ChevronUp className="w-3 h-3" />
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Row 2: Left, Stop, Right */}
        <div className="flex gap-2 justify-center">
          <button
            onPointerDown={() => handleButtonPress('left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('left'), 'w-12 h-12')}
            title="Turn Left"
          >
            <ChevronLeft className="w-4 h-4 mx-auto" />
          </button>

          <button
            onPointerUp={handleButtonRelease}
            disabled={!canControl}
            className={cn(
              'w-12 h-12 rounded-xl transition-all font-mono text-[8px] font-bold uppercase tracking-widest',
              'border border-error/50 hover:border-error',
              canControl
                ? 'bg-error/20 hover:bg-error/30 cursor-pointer active:bg-error/40'
                : 'bg-surface-container-high opacity-50 cursor-not-allowed',
            )}
            title="Stop"
          >
            STOP
          </button>

          <button
            onPointerDown={() => handleButtonPress('right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('right'), 'w-12 h-12')}
            title="Turn Right"
          >
            <ChevronRight className="w-4 h-4 mx-auto" />
          </button>
        </div>

        {/* Row 3: Down-Left, Down, Down-Right */}
        <div className="flex gap-2 justify-center">
          <button
            onPointerDown={() => handleButtonPress('down-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('down-left')}
            title="Backward-Left"
          >
            <div className="flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              <ChevronLeft className="w-3 h-3" />
            </div>
          </button>

          <button
            onPointerDown={() => handleButtonPress('down')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('down'), 'w-12 h-12')}
            title="Backward"
          >
            <ChevronDown className="w-4 h-4 mx-auto" />
          </button>

          <button
            onPointerDown={() => handleButtonPress('down-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={buttonClass('down-right')}
            title="Backward-Right"
          >
            <div className="flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* New Row for Rotate Buttons */}
        <div className="flex gap-2 justify-center mt-4">
          <button
            onPointerDown={() => handleButtonPress('rotate-left')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('rotate-left'), 'w-12 h-12')}
            title="Rotate Left"
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          <button
            onPointerDown={() => handleButtonPress('rotate-right')}
            onPointerUp={handleButtonRelease}
            onPointerLeave={handleButtonRelease}
            onPointerCancel={handleButtonRelease}
            disabled={!canControl}
            className={cn(buttonClass('rotate-right'), 'w-12 h-12')}
            title="Rotate Right"
          >
            <RotateCw className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      <div className="mt-4 text-[8px] text-on-surface-variant font-mono">
        Press and hold buttons to move
      </div>
    </div>
  );
}
