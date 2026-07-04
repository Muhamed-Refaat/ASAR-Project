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
  const [cruiseSpeed, setCruiseSpeed] = useState(() => parseInt(localStorage.getItem('auto_cfg_cruise_speed') || '140', 10));
  const [turnSpeed, setTurnSpeed] = useState(() => parseInt(localStorage.getItem('auto_cfg_turn_speed') || '165', 10));
  const [minFrontCm, setMinFrontCm] = useState(() => parseInt(localStorage.getItem('auto_cfg_min_front') || '24', 10));
  const [sideBias, setSideBias] = useState(() => parseInt(localStorage.getItem('auto_cfg_side_bias') || '0', 10));

  // Mission State
  const [targetDist, setTargetDist] = useState(5.0);
  const [targetAngle, setTargetAngle] = useState(0);

  const canControl = robotReady && isLeader;

  const applyConfig = () => {
    if (!canControl) return;

    const cfg = {
      cruiseSpeed: clamp(cruiseSpeed, 60, 220),
      turnSpeed: clamp(turnSpeed, 90, 255),
      minFrontCm: clamp(minFrontCm, 10, 80),
      cautionFrontCm: clamp(minFrontCm + 18, 14, 140), // Calculated default
      reverseSpeed: 120,
      reverseMs: 400,
      turnMs: 600,
      sideBias: clamp(sideBias, -100, 100),
    };

    sendCommand(
      `AUTO_CFG:${cfg.cruiseSpeed}:${cfg.turnSpeed}:${cfg.minFrontCm}:${cfg.cautionFrontCm}:${cfg.reverseSpeed}:${cfg.reverseMs}:${cfg.turnMs}:${cfg.sideBias}`,
    );

    localStorage.setItem('auto_cfg_cruise_speed', String(cfg.cruiseSpeed));
    localStorage.setItem('auto_cfg_turn_speed', String(cfg.turnSpeed));
    localStorage.setItem('auto_cfg_min_front', String(cfg.minFrontCm));
    localStorage.setItem('auto_cfg_side_bias', String(cfg.sideBias));
  };

  const startMission = () => {
    if (!canControl) return;
    applyConfig(); // Ensure latest behavior config is sent
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

      {/* Behavior Profile */}
      <div className="p-4 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-on-surface">Behavior Profile</h3>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant">
              <span>Cruise Velocity</span>
              <span>{cruiseSpeed} PWM</span>
            </div>
            <input type="range" min={60} max={220} value={cruiseSpeed} onChange={(e) => setCruiseSpeed(parseInt(e.target.value, 10))} className="w-full mt-1 accent-primary" />
          </label>

          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant">
              <span>Obstacle Safety Buffer</span>
              <span>{minFrontCm} cm</span>
            </div>
            <input type="range" min={10} max={60} value={minFrontCm} onChange={(e) => setMinFrontCm(parseInt(e.target.value, 10))} className="w-full mt-1 accent-primary" />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-1">
             <label className="block">
              <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-1">
                <span>Turn Speed</span>
                <span>{turnSpeed}</span>
              </div>
              <input type="number" min={90} max={255} value={turnSpeed} onChange={(e) => setTurnSpeed(parseInt(e.target.value || '0', 10))} className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-[10px] font-mono" />
            </label>
            <label className="block">
              <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-1">
                <span>Side Bias</span>
                <span>{sideBias}</span>
              </div>
              <input type="number" min={-100} max={100} value={sideBias} onChange={(e) => setSideBias(parseInt(e.target.value || '0', 10))} className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-[10px] font-mono" />
            </label>
          </div>
        </div>

        <button
          onClick={applyConfig}
          disabled={!canControl}
          className={`w-full py-2 rounded-xl font-sans text-[10px] font-bold uppercase transition-all ${!canControl ? 'opacity-50 bg-primary/20 text-on-surface/40' : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'}`}
        >
          Update Behavior Profile
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

