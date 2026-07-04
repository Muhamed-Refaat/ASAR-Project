import { useMemo, useState } from 'react';
import { Target, Flag, Zap, ShieldAlert, Navigation2 } from 'lucide-react';

interface AutoPilotPanelProps {
  robotReady: boolean;
  isLeader?: boolean;
  autopilotEnabled: boolean;
  autopilotPhase: string;
  autopilotRisk: number;
  autopilotCmdLeft: number;
  autopilotCmdRight: number;
  autopilotLastEvent: string;
  distLeft: number;
  distFront: number;
  distRight: number;
  distBack: number;
  sendCommand: (cmd: string) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AutoPilotPanel({
  robotReady,
  isLeader = true,
  autopilotEnabled,
  autopilotPhase,
  autopilotRisk,
  autopilotCmdLeft,
  autopilotCmdRight,
  autopilotLastEvent,
  distLeft,
  distFront,
  distRight,
  distBack,
  sendCommand,
}: AutoPilotPanelProps) {
  // Simplified Config
  // Mission State
  const [targetDist, setTargetDist] = useState(5.0);
  const [targetAngle, setTargetAngle] = useState(0);

  const canControl = robotReady && isLeader;

  const startMission = () => {
    if (!canControl) return;
    sendCommand(`GOAL:${targetDist}:${targetAngle}`);
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
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">collision risk</p>
            <p className={`font-mono text-xl font-bold ${autopilotRisk > 60 ? 'text-error' : 'text-primary'}`}>{Math.round(autopilotRisk)}%</p>
            <p className="font-mono text-[9px] uppercase text-on-surface-variant">{riskLabel}</p>
          </div>
          <div className="rounded-xl bg-surface-container-high p-3 border border-white/10">
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">drive output</p>
            <p className="font-mono text-lg font-bold text-secondary">{autopilotCmdLeft}:{autopilotCmdRight}</p>
            <p className="font-mono text-[9px] uppercase text-on-surface-variant">L:R PWM</p>
          </div>
        </div>

        <p className="mt-3 font-mono text-[9px] text-on-surface-variant uppercase tracking-wider text-center bg-black/20 py-1 rounded-md">
          Telemetry: L:{distLeft.toFixed(0)} F:{distFront.toFixed(0)} R:{distRight.toFixed(0)} B:{distBack.toFixed(0)} | Event: {autopilotLastEvent || 'IDLE'}
        </p>
      </div>


      {/* Mission Planning */}
      <div className="p-4 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Navigation2 className="w-4 h-4 text-secondary" />
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">Mission Objective</h3>
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
          onClick={startMission}
          disabled={!canControl || autopilotEnabled}
          className={`w-full py-3 rounded-xl font-sans text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${!canControl || autopilotEnabled ? 'bg-surface-container-highest text-on-surface/30 cursor-not-allowed' : 'bg-secondary text-surface shadow-lg hover:brightness-110'}`}
        >
          <Target className="w-4 h-4" />
          Initiate Autonomous Navigation
        </button>
      </div>



      <div className="p-4 rounded-2xl glass-panel">
        <h3 className="font-mono text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Protocol Reference</h3>
        <ul className="space-y-1.5 text-[10px] text-on-surface-variant/80 font-sans" id="autopilot-instructions">
          <li className="flex items-start gap-2"><Flag className="w-3 h-3 shrink-0 mt-0.5" /> Start mission to set a vector goal relative to current position.</li>
          <li className="flex items-start gap-2"><Navigation2 className="w-3 h-3 shrink-0 mt-0.5" /> Robot uses odometry for pathing and ultrasonics for active avoidance.</li>
          <li className="flex items-start gap-2"><Zap className="w-3 h-3 shrink-0 mt-0.5" /> Bias + prefers Left turns, - prefers Right turns during avoidance.</li>
        </ul>
      </div>
    </div>
  );
}

