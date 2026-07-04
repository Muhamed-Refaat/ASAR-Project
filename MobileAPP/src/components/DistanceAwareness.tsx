import { Info, ToyBrick } from 'lucide-react';

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

function distanceClass(cm: number): string {
  if (cm <= 0) return 'bg-surface-container-highest border border-white/5 text-on-surface';
  if (cm < 30) return 'bg-error text-surface shadow-[0_0_15px_rgba(255,180,171,0.4)]';
  if (cm < 60) return 'bg-yellow-400 text-surface shadow-[0_0_15px_rgba(250,204,21,0.3)]';
  return 'bg-secondary text-surface shadow-[0_0_15px_rgba(78,222,163,0.3)]';
}

export default function DistanceAwareness({ distFront, distLeft, distRight, distBack }: DistanceAwarenessProps) {
  return (
    <div className="mx-4 mt-6 p-6 rounded-2xl glass-panel text-center" id="distance-card">
      <h3 className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-10">
        Distance Awareness
      </h3>

      <div className="relative w-full max-w-[240px] mx-auto h-48 flex items-center justify-center">
        {/* Robot Icon in Center */}
        <div className="w-16 h-24 bg-surface-container-high rounded-xl border border-white/10 flex items-center justify-center relative shadow-lg">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-secondary rounded-full animate-pulse" />
          <ToyBrick className="w-8 h-8 text-secondary/40" />
        </div>

        {/* Front Data */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <div className={`px-3 py-1 rounded-md font-mono text-sm font-bold shadow-lg ${distanceClass(distFront)}`} id="dist-front">
            {formatDistance(distFront)}
          </div>
          <span className="block font-mono text-[8px] text-on-surface-variant uppercase mt-1">Front</span>
        </div>

        {/* Left Data */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-left">
          <div className={`px-2 py-1 rounded-md font-mono text-sm font-bold ${distanceClass(distLeft)}`} id="dist-left">
            {formatDistance(distLeft)}
          </div>
          <span className="block font-mono text-[8px] text-on-surface-variant uppercase mt-1">Left</span>
        </div>

        {/* Right Data */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-right">
          <div className={`px-2 py-1 rounded-md font-mono text-sm font-bold ${distanceClass(distRight)}`} id="dist-right">
            {formatDistance(distRight)}
          </div>
          <span className="block font-mono text-[8px] text-on-surface-variant uppercase mt-1">Right</span>
        </div>

        {/* Rear Data */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <span className="block font-mono text-[8px] text-on-surface-variant uppercase mb-1">Rear</span>
          <div className={`px-3 py-1 rounded-md font-mono text-sm font-bold ${distanceClass(distBack)}`} id="dist-rear">
            {formatDistance(distBack)}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-start gap-2 p-3 bg-white/5 rounded-xl text-left border border-white/5 overflow-hidden">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="font-sans text-[10px] text-on-surface-variant leading-relaxed">
          Tip: keep front distance above safe threshold.
        </p>
      </div>
    </div>
  );
}
