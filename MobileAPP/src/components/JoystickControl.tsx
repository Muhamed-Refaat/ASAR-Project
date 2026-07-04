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
  const rotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleLastSentAtRef = useRef(0);
  const pendingCommandRef = useRef<string | null>(null);

  // Rotate in place: opposite speeds on left and right
  // SPD:left:right -> left motor speed : right motor speed
  // For in-place rotation:
  //   Left rotation: right forward, left backward -> SPD:-200:200
  //   Right rotation: left forward, right backward -> SPD:200:-200
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
    // Immediate send, then keepalive sends while button remains pressed.
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

    // Apply deadband for straight movement stability (prevents jitter)
    const DEADBAND = 10;
    if (Math.abs(dragX) < DEADBAND) dragX = 0;
    if (Math.abs(dragY) < DEADBAND) dragY = 0;

    const ls = Math.round(Math.max(-255, Math.min(255, ((-dragY + dragX) * 255) / 80)));
    const rs = Math.round(Math.max(-255, Math.min(255, ((-dragY - dragX) * 255) / 80)));

    setLeftSpeed(ls);
    setRightSpeed(rs);
    throttledSend(`SPD:${ls}:${rs}`);
  };

  const handleDragEnd = () => {
    setLeftSpeed(0);
    setRightSpeed(0);
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

  const disabledClass = !canControl ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className="mx-4 mt-6 p-6 rounded-2xl glass-panel text-center" id="drive-vector-card">
      <h3 className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-8">
        Drive Vector Control
      </h3>

      <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center">
        <div className="absolute inset-0 border border-white/5 rounded-full" />
        <div className="absolute inset-[20%] border border-white/5 rounded-full" />
        <div className="absolute inset-[40%] border border-white/5 rounded-full" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[1px] h-full bg-white/5" />
          <div className="h-[1px] w-full bg-white/5 absolute" />
        </div>

        <motion.div
          drag={canControl}
          dragConstraints={{ left: -80, right: 80, top: -80, bottom: 80 }}
          dragElastic={0.1}
          dragSnapToOrigin
          whileDrag={{ scale: 1.1 }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className={cn(
            'w-16 h-16 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-full flex items-center justify-center relative z-10 glow-primary',
            canControl ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-50',
          )}
          id="joystick-handle"
        >
          <div className="w-8 h-8 bg-primary rounded-full" />
        </motion.div>
      </div>

      <div className="flex gap-4 mt-10">
        <button
          onPointerDown={handleRotateLeftStart}
          onPointerUp={handleRotateStop}
          onPointerLeave={handleRotateStop}
          onPointerCancel={handleRotateStop}
          disabled={!canControl}
          className={cn(
            'flex-1 glass-panel py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors',
            disabledClass,
          )}
          id="rotate-left-btn"
        >
          <RotateCcw className="w-4 h-4 text-primary" />
          <span className="font-sans text-[10px] font-bold uppercase text-primary">Rotate Left</span>
        </button>
        <button
          onPointerDown={handleRotateRightStart}
          onPointerUp={handleRotateStop}
          onPointerLeave={handleRotateStop}
          onPointerCancel={handleRotateStop}
          disabled={!canControl}
          className={cn(
            'flex-1 glass-panel py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors',
            disabledClass,
          )}
          id="rotate-right-btn"
        >
          <span className="font-sans text-[10px] font-bold uppercase text-primary">Rotate Right</span>
          <RotateCw className="w-4 h-4 text-primary" />
        </button>
      </div>

      <div className="flex items-center justify-around mt-8 border-t border-white/5 pt-8">
        <div>
          <span className="block font-mono text-[10px] font-bold text-on-surface-variant uppercase mb-1">Left CMD</span>
          <span className="font-mono text-3xl font-bold text-primary">{leftSpeed}</span>
        </div>
        <div className="w-[1px] h-8 bg-white/5" />
        <div>
          <span className="block font-mono text-[10px] font-bold text-on-surface-variant uppercase mb-1">Right CMD</span>
          <span className="font-mono text-3xl font-bold text-primary">{rightSpeed}</span>
        </div>
      </div>
    </div>
  );
}
