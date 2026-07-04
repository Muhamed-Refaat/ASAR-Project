import { useMemo, useState } from 'react';
import { Target, Flag, ShieldAlert, Navigation2, Zap, RotateCcw } from 'lucide-react';

interface AutoPilotPanelProps {
  robotReady: boolean;
  isLeader?: boolean;
  autopilotEnabled: boolean;
  autopilotPhase: string;
  autopilotRisk: number;
  autopilotCmdLeft: number;
  autopilotCmdRight: number;
  autopilotLastEvent: string;
  posX?: number;
  posY?: number;
  heading?: number;
  distLeft: number;
  distFront: number;
  distRight: number;
  distBack: number;
  sendCommand: (cmd: string) => void;
}

const PRESET_ROUNDS = [
  { x: 1000, y: 0, label: "Round 1 (x1, y1)" },
  { x: 1000, y: 1000, label: "Round 2 (x2, y2)" },
  { x: 0, y: 1000, label: "Round 3 (x3, y3)" },
  { x: 0, y: 0, label: "Round 4 (x4, y4)" },
  { x: 1500, y: 1500, label: "Round 5 (Final Target)" }
];

export default function AutoPilotPanel({
  robotReady,
  isLeader = true,
  autopilotEnabled,
  autopilotPhase,
  autopilotRisk,
  autopilotCmdLeft,
  autopilotCmdRight,
  autopilotLastEvent,
  posX = 0,
  posY = 0,
  heading = 0,
  distLeft,
  distFront,
  distRight,
  distBack,
  sendCommand,
}: AutoPilotPanelProps) {
  const [targetDist, setTargetDist] = useState(5.0);
  const [targetAngle, setTargetAngle] = useState(0);

  const [absX, setAbsX] = useState(0);
  const [absY, setAbsY] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);

  const canControl = robotReady && isLeader;

  const startRelativeMission = () => {
    if (!canControl) return;
    sendCommand(`GOAL:${targetDist}:${targetAngle}`);
  };

  const startAbsoluteMission = () => {
    if (!canControl) return;
    sendCommand(`ABS_GOAL:${absX}:${absY}`);
  };

  const startPresetRound = (index: number) => {
    if (!canControl) return;
    setCurrentRound(index);
    setAbsX(PRESET_ROUNDS[index].x);
    setAbsY(PRESET_ROUNDS[index].y);
    sendCommand(`ABS_GOAL:${PRESET_ROUNDS[index].x}:${PRESET_ROUNDS[index].y}`);
  };

  const toggleAutopilot = () => {
    if (!canControl) return;
    sendCommand(autopilotEnabled ? 'AUTO_OFF' : 'AUTO_ON');
  };

  const riskLabel = useMemo(() => {
    if (autopilotRisk >= 75) return 'critical';
    if (autopilotRisk >= 45) return 'elevated';
    return 'low';
  }, [autopilotRisk]);

  return (
    <div className="mx-4 mt-4 mb-24 space-y-4" id="autopilot-panel">
      {/* Supervisor Header */}
      <div className="p-4 rounded-2xl glass-panel bg-primary/5 border border-primary/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${autopilotEnabled ? 'text-secondary animate-pulse' : 'text-on-surface-variant'}`} />
              <h2 className="font-sans text-base font-bold uppercase tracking-wide text-primary">Mission Supervisor</h2>
            </div>
            <p className="mt-1 font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
              State: <span className={autopilotEnabled ? 'text-secondary' : ''}>{autopilotPhase}</span>
            </p>
          </div>
          <button
            onClick={toggleAutopilot}
            disabled={!canControl}
            className={`px-4 py-2 rounded-xl font-sans text-xs font-bold uppercase transition-all ${autopilotEnabled ? 'bg-error text-surface glow-error' : 'bg-secondary text-surface'} ${!canControl ? 'opacity-50' : ''}`}
          >
            {autopilotEnabled ? 'Abort Mission' : 'Idle Mode'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-surface-container-high p-3 border border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Odometry</p>
            <p className="font-mono text-sm font-bold text-secondary flex justify-center gap-2 mt-1">
              <span>X:{Math.round(posX)}</span>
              <span>Y:{Math.round(posY)}</span>
            </p>
            <p className="font-mono text-[9px] uppercase text-on-surface-variant mt-1">Yaw: {Math.round(heading)}°</p>
          </div>
          <div className="rounded-xl bg-surface-container-high p-3 border border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Output</p>
            <p className="font-mono text-lg font-bold text-secondary mt-1">{autopilotCmdLeft}:{autopilotCmdRight}</p>
            <p className="font-mono text-[9px] uppercase text-on-surface-variant">L:R PWM</p>
          </div>
        </div>

        <p className="mt-3 font-mono text-[9px] text-on-surface-variant uppercase tracking-wider text-center bg-black/20 py-1 rounded-md">
          Risk: {Math.round(autopilotRisk)}% ({riskLabel}) | Event: {autopilotLastEvent || 'IDLE'}
        </p>
      </div>

      {/* 5-Round Absolute Pathing Simulator */}
      <div className="p-4 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <RotateCcw className="w-4 h-4 text-tertiary" />
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">5-Round Self-Evolve Path</h3>
        </div>
        <p className="text-[10px] text-on-surface-variant font-mono">
          Execute a 5-round evolutionary test loop. The robot will dynamically avoid obstacles while navigating to these absolute coordinate checkpoints.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_ROUNDS.map((round, idx) => (
            <button
              key={idx}
              onClick={() => startPresetRound(idx)}
              disabled={!canControl || autopilotEnabled}
              className={`flex items-center justify-between py-2 px-4 rounded-xl border transition-all ${
                !canControl || autopilotEnabled 
                  ? 'bg-surface-container-highest border-white/5 text-on-surface-variant/50 cursor-not-allowed' 
                  : currentRound === idx 
                    ? 'bg-tertiary/10 border-tertiary text-tertiary hover:bg-tertiary/20' 
                    : 'bg-surface-container-high border-white/10 text-on-surface hover:border-white/20'
              }`}
            >
              <span className="font-sans text-[11px] font-bold uppercase">{round.label}</span>
              <span className="font-mono text-[10px]">X:{round.x} Y:{round.y}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Relative Mission Planning */}
      <div className="p-4 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Navigation2 className="w-4 h-4 text-secondary" />
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">Relative Navigation</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-1">
              <span>Distance (m)</span>
              <span className="text-secondary">{targetDist.toFixed(1)}m</span>
            </div>
            <input 
              type="range" min={0.5} max={25} step={0.5} 
              value={targetDist} 
              onChange={(e) => setTargetDist(parseFloat(e.target.value))} 
              className="w-full accent-secondary" 
            />
          </label>

          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-1">
              <span>Bearing (deg)</span>
              <span className="text-secondary">{targetAngle}°</span>
            </div>
            <input 
              type="range" min={-180} max={180} step={15} 
              value={targetAngle} 
              onChange={(e) => setTargetAngle(parseInt(e.target.value, 10))} 
              className="w-full accent-secondary" 
            />
          </label>
        </div>

        <div className="flex justify-center gap-4 text-[8px] font-mono text-on-surface-variant uppercase">
          <span>0°=Forward</span>
          <span>90°=Left</span>
          <span>-90°=Right</span>
          <span>180°=Back</span>
        </div>

        <button
          onClick={startRelativeMission}
          disabled={!canControl || autopilotEnabled}
          className={`w-full py-3 rounded-xl font-sans text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${!canControl || autopilotEnabled ? 'bg-surface-container-highest text-on-surface/30 cursor-not-allowed' : 'bg-secondary text-surface shadow-lg hover:brightness-110'}`}
        >
          <Target className="w-4 h-4" /> Go Relative Goal
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-white/5 bg-black/40">
        <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">How it works:</h4>
        <ul className="space-y-2 font-mono text-[8px] text-on-surface-variant/80">
          <li className="flex items-start gap-2"><Target className="w-3 h-3 shrink-0 mt-0.5" /> P-Controller gently guides heading towards the virtual target coordinate.</li>
          <li className="flex items-start gap-2"><Flag className="w-3 h-3 shrink-0 mt-0.5" /> Potential-Field Blending seamlessly pushes coordinates away from obstacles while pursuing goal.</li>
          <li className="flex items-start gap-2"><Zap className="w-3 h-3 shrink-0 mt-0.5" /> 5-Round Simulator executes independent autonomous coordinate stages.</li>
        </ul>
      </div>
    </div>
  );
}