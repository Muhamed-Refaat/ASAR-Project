import { Info, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';
import { motion } from 'motion/react';

interface DistanceAwarenessProps {
  distFront: number;
  distLeft: number;
  distRight: number;
  distBack: number;
}

function formatDistance(cm: number): string {
  if (cm <= 0) return 'CLEAR';
  if (cm < 100) return `${Math.round(cm)}cm`;
  return `${(cm / 100).toFixed(2)}m`;
}

export default function DistanceAwareness({ distFront, distLeft, distRight, distBack }: DistanceAwarenessProps) {
  // Determine danger status
  const dangerLevels = useMemo(() => {
    const check = (cm: number) => {
      if (cm <= 0) return 'clear';
      if (cm < 30) return 'danger';
      if (cm < 60) return 'warning';
      return 'safe';
    };
    return {
      front: check(distFront),
      left: check(distLeft),
      right: check(distRight),
      back: check(distBack)
    };
  }, [distFront, distLeft, distRight, distBack]);

  const hasDanger = useMemo(() => {
    return Object.values(dangerLevels).some(level => level === 'danger');
  }, [dangerLevels]);

  const stateClass = (level: string) => {
    switch (level) {
      case 'danger': return 'bg-error/20 border-error text-error glow-text-error animate-pulse';
      case 'warning': return 'bg-warning/20 border-warning text-warning glow-text-warning';
      case 'safe': return 'bg-secondary/10 border-secondary/40 text-secondary glow-text-secondary';
      default: return 'bg-surface-container border-primary/10 text-on-surface-variant';
    }
  };

  const lineStroke = (level: string) => {
    switch (level) {
      case 'danger': return 'var(--color-error)';
      case 'warning': return 'var(--color-warning)';
      case 'safe': return 'var(--color-secondary)';
      default: return 'var(--color-primary)';
    }
  };

  return (
    <div className={`mx-4 mt-6 p-5 glass-panel border ${hasDanger ? 'border-error/30 bg-error/2' : 'border-primary/20'} cyber-corners font-mono select-none`} id="distance-card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          [ SONAR SENSORY RADAR ]
        </h3>
        {hasDanger && (
          <span className="text-[8px] font-black uppercase text-error tracking-wider bg-error/15 px-2 py-0.5 animate-pulse border border-error/30 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-error" /> COLLISION_HAZARD
          </span>
        )}
      </div>

      <div className="relative w-full max-w-[240px] mx-auto h-52 flex items-center justify-center overflow-hidden">
        {/* Radar grids back-layer */}
        <div className="absolute w-44 h-44 rounded-full border border-primary/5 pointer-events-none" />
        <div className="absolute w-32 h-32 rounded-full border border-primary/5 pointer-events-none" />
        <div className="absolute w-20 h-20 rounded-full border border-primary/5 pointer-events-none" />

        {/* Diagonal sector sweep lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
          <div className="w-[1px] h-full bg-primary rotate-45" />
          <div className="w-[1px] h-full bg-primary -rotate-45" />
        </div>

        {/* Live Vector Beams */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          {/* Front Sonar Line */}
          {distFront > 0 && (
            <line x1="50%" y1="50%" x2="50%" y2="12%" stroke={lineStroke(dangerLevels.front)} strokeWidth="2" strokeDasharray="3 3" />
          )}
          {/* Left Sonar Line */}
          {distLeft > 0 && (
            <line x1="50%" y1="50%" x2="15%" y2="50%" stroke={lineStroke(dangerLevels.left)} strokeWidth="2" strokeDasharray="3 3" />
          )}
          {/* Right Sonar Line */}
          {distRight > 0 && (
            <line x1="50%" y1="50%" x2="85%" y2="50%" stroke={lineStroke(dangerLevels.right)} strokeWidth="2" strokeDasharray="3 3" />
          )}
          {/* Rear Sonar Line */}
          {distBack > 0 && (
            <line x1="50%" y1="50%" x2="50%" y2="88%" stroke={lineStroke(dangerLevels.back)} strokeWidth="2" strokeDasharray="3 3" />
          )}
        </svg>

        {/* Robot Chassis Wireframe in Center */}
        <div className="w-12 h-20 bg-surface-container-high border-2 border-primary/30 flex flex-col items-center justify-center relative shadow-lg">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4.5 h-1.5 bg-primary/20 border border-primary/30 rounded-none" />
          <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest">ASAR</span>
          <span className="text-[6px] text-primary/30 mt-0.5">4WD</span>
          <div className="absolute bottom-1 w-2 h-1 bg-error/30" />
        </div>

        {/* Front Data */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className={`px-2.5 py-1 border text-[10px] font-bold ${stateClass(dangerLevels.front)}`} id="dist-front">
            {formatDistance(distFront)}
          </div>
          <span className="text-[7px] text-on-surface-variant uppercase mt-1">SENS_F</span>
        </div>

        {/* Left Data */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className={`px-2 py-1 border text-[10px] font-bold ${stateClass(dangerLevels.left)}`} id="dist-left">
            {formatDistance(distLeft)}
          </div>
          <span className="text-[7px] text-on-surface-variant uppercase mt-1">SENS_L</span>
        </div>

        {/* Right Data */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className={`px-2 py-1 border text-[10px] font-bold ${stateClass(dangerLevels.right)}`} id="dist-right">
            {formatDistance(distRight)}
          </div>
          <span className="text-[7px] text-on-surface-variant uppercase mt-1">SENS_R</span>
        </div>

        {/* Rear Data */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-[7px] text-on-surface-variant uppercase mb-1">SENS_B</span>
          <div className={`px-2.5 py-1 border text-[10px] font-bold ${stateClass(dangerLevels.back)}`} id="dist-rear">
            {formatDistance(distBack)}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2.5 p-3 bg-primary/5 border border-primary/10">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[9px] text-on-surface-variant leading-relaxed uppercase">
          [ AUTOPILOT SAFEST STATE ]: MAINTAIN FRONT_RANGE ABOVE 30CM TO AVOID ACTIVE HULL ESCAPE REVERSAL TRIGGERS.
        </p>
      </div>
    </div>
  );
}
