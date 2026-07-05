import { useMemo, useState } from 'react';
import { Target, Flag, ShieldAlert, Navigation2, Zap, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

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
  { x: 1000, y: 0, label: "01", name: "Alpha Checkpoint" },
  { x: 1000, y: 1000, label: "02", name: "Beta Intersection" },
  { x: 0, y: 1000, label: "03", name: "Gamma Corridor" },
  { x: 0, y: 0, label: "04", name: "Delta Hangar" },
  { x: 1500, y: 1500, label: "05", name: "Final Sector Goal" }
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
    if (autopilotRisk >= 75) return 'CRITICAL';
    if (autopilotRisk >= 45) return 'ELEVATED';
    return 'LOW';
  }, [autopilotRisk]);

  const riskColorClass = useMemo(() => {
    if (autopilotRisk >= 75) return 'text-error glow-text-error';
    if (autopilotRisk >= 45) return 'text-warning glow-text-warning';
    return 'text-secondary glow-text-secondary';
  }, [autopilotRisk]);

  return (
    <div className="mx-4 mt-4 mb-24 space-y-4 font-mono select-none crt-flicker" id="autopilot-panel">
      {/* Supervisor Header */}
      <div className="p-4 rounded-none glass-panel bg-primary/5 border border-primary/20 cyber-corners">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${autopilotEnabled ? 'text-secondary animate-pulse glow-text-secondary' : 'text-on-surface-variant'}`} />
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary glow-text-primary">MISSION_SUPERVISOR</h2>
            </div>
            <p className="mt-1 text-[9px] text-on-surface-variant uppercase tracking-widest">
              AUTOPILOT_PHASE: <span className={autopilotEnabled ? 'text-secondary glow-text-secondary font-black' : ''}>{autopilotPhase}</span>
            </p>
          </div>
          <button
            onClick={toggleAutopilot}
            disabled={!canControl}
            className={cn(
              "px-3.5 py-1.5 border font-mono text-[10px] font-black uppercase transition-all duration-200 active:scale-[0.98]",
              autopilotEnabled 
                ? "bg-error/20 border-error text-error glow-error hover:bg-error/30" 
                : "bg-secondary/15 border-secondary text-secondary glow-secondary hover:bg-secondary/25",
              !canControl && "opacity-40 cursor-not-allowed"
            )}
          >
            {autopilotEnabled ? 'ABORT_MISSION' : 'INIT_MISSION'}
          </button>
        </div>

        {/* Odometry & Actuators Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="bg-black/30 p-2.5 border border-primary/10 relative">
            <div className="absolute top-0.5 left-1 text-[6px] text-primary/30 font-bold uppercase">01 // VECT_ODO</div>
            <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mt-1">Robot Odometry</p>
            <p className="text-sm font-bold text-secondary glow-text-secondary flex justify-center gap-2 mt-1.5">
              <span>X:{Math.round(posX)}</span>
              <span>Y:{Math.round(posY)}</span>
            </p>
            <p className="text-[8px] uppercase text-on-surface-variant tracking-wider mt-0.5">YAW_HEADING: {Math.round(heading)}°</p>
          </div>
          <div className="bg-black/30 p-2.5 border border-primary/10 relative">
            <div className="absolute top-0.5 left-1 text-[6px] text-primary/30 font-bold uppercase">02 // ACTU_PWM</div>
            <p className="text-[8px] uppercase tracking-widest text-on-surface-variant mt-1">Actuators Output</p>
            <p className="text-sm font-bold text-secondary glow-text-secondary mt-1.5">{autopilotCmdLeft} : {autopilotCmdRight}</p>
            <p className="text-[8px] uppercase text-on-surface-variant tracking-wider mt-0.5">L:R POWER PWM</p>
          </div>
        </div>

        <div className="mt-3 flex justify-between items-center text-[8px] text-on-surface-variant uppercase tracking-wider bg-black/40 px-3 py-1.5 border border-primary/5">
          <span>COLLISION_RISK: <span className={riskColorClass}>{Math.round(autopilotRisk)}%</span> ({riskLabel})</span>
          <span>EVT: <span className="text-primary glow-text-primary font-bold">{autopilotLastEvent || 'IDLE'}</span></span>
        </div>
      </div>

      {/* 5-Round Absolute Pathing Sequential Tree */}
      <div className="p-4 rounded-none glass-panel border border-primary/10 cyber-corners-tertiary">
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2 mb-4">
          <RotateCcw className="w-4 h-4 text-tertiary glow-text-tertiary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">[ 5-STAGE SELF-EVOLVE SEQUENCE ]</h3>
        </div>
        <p className="text-[9px] text-on-surface-variant leading-relaxed mb-4 uppercase">
          Triggers dynamic vector path checkpoints. The robot autonomously navigates, resolves obstacle vectors, and updates path logs.
        </p>
        
        {/* Tactical Sequential Tree Nodes */}
        <div className="space-y-2">
          {PRESET_ROUNDS.map((round, idx) => {
            const isCurrent = currentRound === idx;
            const isCompleted = currentRound > idx;
            
            return (
              <button
                key={idx}
                onClick={() => startPresetRound(idx)}
                disabled={!canControl || autopilotEnabled}
                className={cn(
                  "w-full flex items-center justify-between py-2 px-3 border transition-all text-left relative",
                  isCurrent
                    ? "bg-tertiary/15 border-tertiary text-tertiary glow-tertiary"
                    : isCompleted
                      ? "bg-secondary/5 border-secondary/25 text-secondary/70"
                      : "bg-surface-container-high border-primary/10 text-on-surface hover:border-primary/25",
                  (!canControl || autopilotEnabled) && "opacity-45 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Glowing step indicator */}
                  <div className={cn(
                    "w-5 h-5 flex items-center justify-center border font-mono text-[9px] font-black",
                    isCurrent 
                      ? "border-tertiary bg-tertiary text-black" 
                      : isCompleted
                        ? "border-secondary bg-secondary/15 text-secondary"
                        : "border-primary/20 text-on-surface-variant"
                  )}>
                    {round.label}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase">{round.name}</p>
                    <p className="text-[7px] text-on-surface-variant uppercase">TARGET_COORDINATES</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold">X:{round.x} Y:{round.y}</p>
                  <p className="text-[7px] text-on-surface-variant uppercase">
                    {isCurrent ? "ACTIVE_SWEEP" : isCompleted ? "CHECK_PASSED" : "PENDING_EXEC"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Relative Mission Planning */}
      <div className="p-4 rounded-none glass-panel border border-primary/10 cyber-corners-secondary">
        <div className="flex items-center gap-2 border-b border-primary/20 pb-2 mb-4">
          <Navigation2 className="w-4 h-4 text-secondary glow-text-secondary" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-on-surface">[ MANUAL MISSION CONFIG ]</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-2">
              <span>Goal Dist (m)</span>
              <span className="text-secondary font-black glow-text-secondary">{targetDist.toFixed(1)}m</span>
            </div>
            {/* Custom slider tracks */}
            <input 
              type="range" min={0.5} max={25} step={0.5} 
              value={targetDist} 
              onChange={(e) => setTargetDist(parseFloat(e.target.value))} 
              className="w-full accent-secondary bg-surface-container border border-primary/10 py-1" 
            />
          </label>

          <label className="block">
            <div className="flex justify-between font-mono text-[9px] uppercase text-on-surface-variant mb-2">
              <span>Goal Bearing (deg)</span>
              <span className="text-secondary font-black glow-text-secondary">{targetAngle}°</span>
            </div>
            <input 
              type="range" min={-180} max={180} step={15} 
              value={targetAngle} 
              onChange={(e) => setTargetAngle(parseInt(e.target.value, 10))} 
              className="w-full accent-secondary bg-surface-container border border-primary/10 py-1" 
            />
          </label>
        </div>

        <div className="flex justify-between text-[7px] font-bold text-on-surface-variant uppercase mt-3 px-1">
          <span>0°=STR_FWD</span>
          <span>90°=HARD_LEFT</span>
          <span>-90°=HARD_RIGHT</span>
          <span>180°=STR_REV</span>
        </div>

        <button
          onClick={startRelativeMission}
          disabled={!canControl || autopilotEnabled}
          className={cn(
            "mt-4 w-full py-3 border font-sans text-xs font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            !canControl || autopilotEnabled 
              ? "bg-surface-container-highest border-white/5 text-on-surface-variant/30 cursor-not-allowed" 
              : "bg-secondary/15 border-secondary text-secondary glow-secondary hover:bg-secondary/25"
          )}
        >
          <Target className="w-4 h-4" /> COMPUTE & EXECUTE RELATIVE VECTOR
        </button>
      </div>

      {/* Cyber Instructions Legend */}
      <div className="p-4 rounded-none border border-primary/10 bg-black/40 relative">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-primary/10 select-none pointer-events-none">SYS_GUIDE_V6</div>
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-2.5">// MISSION CONTROL DIRECTIVES:</h4>
        <ul className="space-y-2 text-[8px] text-on-surface-variant leading-normal">
          <li className="flex items-start gap-2.5">
            <Target className="w-3.5 h-3.5 text-primary shrink-0" /> 
            <span>PROPORTIONAL STEER VECTOR CALCULATIONS CONTINUOUSLY CONVERGE TOWARDS VIRTUAL COORDINATE.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Flag className="w-3.5 h-3.5 text-secondary shrink-0" /> 
            <span>POTENTIAL-FIELD ALCOVERY MATRIX DEFLECTS TRAJECTORY PATH IN REALTIME AROUND INTRUDING OBSTACLES.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <Zap className="w-3.5 h-3.5 text-tertiary shrink-0" /> 
            <span>5-ROUND EVOLUTION PATH INITIATES SEQUENCE VERIFICATIONS DIRECTLY OVER CORE ARDUINO DRIVER KERNELS.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
