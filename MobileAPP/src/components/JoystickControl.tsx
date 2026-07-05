import { RotateCcw, RotateCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/src/lib/utils';

interface JoystickControlProps {
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
}

interface DragInfo {
  offset: {
    x: number;
    y: number;
  };
}

export default function JoystickControl({ sendCommand, robotReady, isLeader = true, manualLocked = false }: JoystickControlProps) {
  const canControl = robotReady && isLeader && !manualLocked;
  const [leftSpeed, setLeftSpeed] = useState(0);
  const [rightSpeed, setRightSpeed] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleLastSentAtRef = useRef(0);
  const pendingCommandRef = useRef<string | null>(null);

  const ROTATE_LEFT_CMD = 'SPD:-200:200';
  const ROTATE_RIGHT_CMD = 'SPD:200:-200';

  const clearThrottleTimer = () => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  };

  const clearRotateTimer = () => {
    if (rotateTimerRef.current) {
      clearInterval(rotateTimerRef.current);
      rotateTimerRef.current = null;
    }
  };

  const startRotateHold = (command: string) => {
    if (!canControl) return;
    clearRotateTimer();
    sendCommand(command);
    rotateTimerRef.current = setInterval(() => {
      if (!canControl) return;
      sendCommand(command);
    }, 100);
  };

  const throttledSend = (command: string) => {
    if (!canControl) return;
    const now = Date.now();
    const elapsed = now - throttleLastSentAtRef.current;
    const throttleMs = 50;

    if (elapsed >= throttleMs) {
      sendCommand(command);
      throttleLastSentAtRef.current = now;
      pendingCommandRef.current = null;
      clearThrottleTimer();
      return;
    }

    pendingCommandRef.current = command;
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        if (pendingCommandRef.current && robotReady) {
          sendCommand(pendingCommandRef.current);
          throttleLastSentAtRef.current = Date.now();
        }
        pendingCommandRef.current = null;
        throttleTimerRef.current = null;
      }, throttleMs - elapsed);
    }
  };

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: DragInfo) => {
    let dragX = Math.max(-80, Math.min(80, info.offset.x));
    let dragY = Math.max(-80, Math.min(80, info.offset.y));

    const DEADBAND = 10;
    if (Math.abs(dragX) < DEADBAND) dragX = 0;
    if (Math.abs(dragY) < DEADBAND) dragY = 0;

    setDragOffset({ x: dragX, y: dragY });

    const ls = Math.round(Math.max(-255, Math.min(255, ((-dragY + dragX) * 255) / 80)));
    const rs = Math.round(Math.max(-255, Math.min(255, ((-dragY - dragX) * 255) / 80)));

    setLeftSpeed(ls);
    setRightSpeed(rs);
    throttledSend(`SPD:${ls}:${rs}`);
  };

  const handleDragEnd = () => {
    setLeftSpeed(0);
    setRightSpeed(0);
    setDragOffset({ x: 0, y: 0 });
    clearThrottleTimer();
    clearRotateTimer();
    pendingCommandRef.current = null;
    if (canControl) {
      sendCommand('STOP');
    }
  };

  const handleRotateLeftStart = () => {
    if (!canControl) return;
    setLeftSpeed(-200);
    setRightSpeed(200);
    startRotateHold(ROTATE_LEFT_CMD);
  };

  const handleRotateRightStart = () => {
    if (!canControl) return;
    setLeftSpeed(200);
    setRightSpeed(-200);
    startRotateHold(ROTATE_RIGHT_CMD);
  };

  const handleRotateStop = () => {
    clearRotateTimer();
    setLeftSpeed(0);
    setRightSpeed(0);
    if (!canControl) return;
    sendCommand('STOP');
  };

  useEffect(() => {
    return () => {
      clearThrottleTimer();
      clearRotateTimer();
    };
  }, []);

  const disabledClass = !canControl ? 'opacity-40 cursor-not-allowed' : '';

  return (
    <div className="mx-4 mt-6 p-5 glass-panel border border-primary/20 cyber-corners bg-surface-container/60 font-mono select-none" id="drive-vector-card">
      <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-6 text-center">
        [ VECTOR DRIVE INTERFACE ]
      </h3>

      <div className="relative w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center bg-black/40 border border-primary/10">
        {/* Concentric target lines */}
        <div className="absolute inset-[10%] border border-primary/5 rounded-none" />
        <div className="absolute inset-[25%] border border-primary/5 rounded-none" />
        <div className="absolute inset-[45%] border border-primary/10 rounded-none" />
        <div className="absolute inset-[65%] border border-primary/5 rounded-none" />

        {/* Diagonal ticks */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none text-[8px] text-primary">
          <div className="absolute top-1 left-1">NW_315°</div>
          <div className="absolute top-1 right-1">NE_045°</div>
          <div className="absolute bottom-1 left-1">SW_225°</div>
          <div className="absolute bottom-1 right-1">SE_135°</div>
        </div>

        {/* Center crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[1px] h-[95%] bg-primary/20" />
          <div className="h-[1px] w-[95%] bg-primary/20 absolute" />
          {/* Subtle center marker */}
          <div className="w-2 h-2 border border-primary/40 bg-black" />
        </div>

        {/* Live Vector Line */}
        {canControl && (dragOffset.x !== 0 || dragOffset.y !== 0) && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="50%"
              y1="50%"
              x2={`${50 + (dragOffset.x / 80) * 50}%`}
              y2={`${50 + (dragOffset.y / 80) * 50}%`}
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
          </svg>
        )}

        <motion.div
          drag={canControl}
          dragConstraints={{ left: -80, right: 80, top: -80, bottom: 80 }}
          dragElastic={0.05}
          dragSnapToOrigin
          whileDrag={{ scale: 1.05 }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className={cn(
            'w-14 h-14 bg-primary/15 border-2 border-primary rounded-none flex items-center justify-center relative z-10 glow-primary transition-colors',
            canControl ? 'cursor-grab active:cursor-grabbing hover:bg-primary/25' : 'cursor-not-allowed opacity-40',
          )}
          id="joystick-handle"
        >
          {/* Outer retro brackets */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t border-l border-primary" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b border-r border-primary" />
          <div className="w-6 h-6 bg-primary border border-black" />
        </motion.div>
      </div>

      {/* Touch Rotate Banks */}
      <div className="flex gap-3 mt-6">
        <button
          onPointerDown={handleRotateLeftStart}
          onPointerUp={handleRotateStop}
          onPointerLeave={handleRotateStop}
          onPointerCancel={handleRotateStop}
          disabled={!canControl}
          className={cn(
            'flex-1 border border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/15 py-3 rounded-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            disabledClass,
          )}
          id="rotate-left-btn"
        >
          <RotateCcw className="w-4 h-4 text-primary glow-text-primary" />
          <span className="text-[10px] font-black uppercase text-primary">ROT_L</span>
        </button>
        <button
          onPointerDown={handleRotateRightStart}
          onPointerUp={handleRotateStop}
          onPointerLeave={handleRotateStop}
          onPointerCancel={handleRotateStop}
          disabled={!canControl}
          className={cn(
            'flex-1 border border-primary/20 hover:border-primary bg-primary/5 hover:bg-primary/15 py-3 rounded-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            disabledClass,
          )}
          id="rotate-right-btn"
        >
          <span className="text-[10px] font-black uppercase text-primary">ROT_R</span>
          <RotateCw className="w-4 h-4 text-primary glow-text-primary" />
        </button>
      </div>

      <div className="flex items-center justify-around mt-6 border-t border-primary/10 pt-6">
        <div>
          <span className="block text-[8px] font-bold text-on-surface-variant uppercase mb-1">MTR_LEFT_OUT</span>
          <span className={`text-2xl font-black ${leftSpeed !== 0 ? 'text-secondary glow-text-secondary' : 'text-primary'}`}>{leftSpeed}</span>
        </div>
        <div className="w-[1px] h-8 bg-primary/10" />
        <div>
          <span className="block text-[8px] font-bold text-on-surface-variant uppercase mb-1">MTR_RIGHT_OUT</span>
          <span className={`text-2xl font-black ${rightSpeed !== 0 ? 'text-secondary glow-text-secondary' : 'text-primary'}`}>{rightSpeed}</span>
        </div>
      </div>
    </div>
  );
}
