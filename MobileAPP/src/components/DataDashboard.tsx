import { Activity, AlertTriangle, Radio, ShieldAlert, ShieldCheck, Timer, Terminal, Download, Trash2, Play, Square } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/src/lib/utils';
import type { RobotEvent, MotionLogEntry } from '../lib/useRobotConnection';

interface DataDashboardProps {
  connected: boolean;
  robotReady: boolean;
  isLeader: boolean;
  rpmLeft: number;
  rpmRight: number;
  distLeft: number;
  distFront: number;
  distRight: number;
  distBack: number;
  autopilotEnabled: boolean;
  autopilotRisk: number;
  rpmLeftHistory: { val: number }[];
  rpmRightHistory: { val: number }[];
  minDistanceHistory: { val: number }[];
  autopilotRiskHistory: { val: number }[];
  eventLog: RobotEvent[];
  messageCount: number;
  connectionStartedAt: number | null;
  motionLoggingEnabled: boolean;
  motionLog: MotionLogEntry[];
  clearMotionLog: () => void;
  sendCommand: (cmd: string) => void;
}

function formatSessionDuration(startAt: number | null): string {
  if (!startAt) return '--:--';
  const totalSec = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function currentClearance(distances: number[]): number {
  const valid = distances.filter((value) => value > 0);
  return valid.length > 0 ? Math.min(...valid) : 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toCombinedSeries(
  left: { val: number }[],
  right: { val: number }[],
  minDist: { val: number }[],
  risk: { val: number }[],
) {
  const maxLen = Math.max(left.length, right.length, minDist.length, risk.length);
  return Array.from({ length: maxLen }, (_, idx) => ({
    idx: idx + 1,
    left: left[idx]?.val,
    right: right[idx]?.val,
    clearance: minDist[idx]?.val,
    risk: risk[idx]?.val,
  }));
}

function levelClass(level: RobotEvent['level']): string {
  if (level === 'error') return 'border-error/40 bg-error/15 text-error glow-text-error';
  if (level === 'warn') return 'border-warning/40 bg-warning/15 text-warning glow-text-warning';
  return 'border-secondary/40 bg-secondary/15 text-secondary glow-text-secondary';
}

export default function DataDashboard({
  connected,
  robotReady,
  isLeader,
  rpmLeft,
  rpmRight,
  distLeft,
  distFront,
  distRight,
  distBack,
  autopilotEnabled,
  autopilotRisk,
  rpmLeftHistory,
  rpmRightHistory,
  minDistanceHistory,
  autopilotRiskHistory,
  eventLog,
  messageCount,
  connectionStartedAt,
  motionLoggingEnabled,
  motionLog,
  clearMotionLog,
  sendCommand,
}: DataDashboardProps) {
  const mergedTrend = toCombinedSeries(rpmLeftHistory, rpmRightHistory, minDistanceHistory, autopilotRiskHistory);
  const clearanceNow = currentClearance([distLeft, distFront, distRight, distBack]);
  const rpmBalance = Math.abs(rpmLeft - rpmRight);
  const avgRpm = average(
    rpmLeftHistory.map((point, idx) => (point.val + (rpmRightHistory[idx]?.val ?? 0)) / 2),
  );
  const warningCount = eventLog.filter((entry) => entry.level !== 'info').length;

  const distanceBars = [
    { axis: 'L_US', value: distLeft },
    { axis: 'F_US', value: distFront },
    { axis: 'R_US', value: distRight },
    { axis: 'B_US', value: distBack },
  ];

  return (
    <section className="mx-4 mt-4 space-y-4 font-mono select-none crt-flicker" id="data-dashboard">
      
      {/* Primary KPI Matrix */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-none glass-panel p-3 border border-secondary/20 cyber-corners-secondary bg-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-secondary glow-text-secondary">[ SYS_UPTIME ]</span>
            <Timer className="w-3.5 h-3.5 text-secondary" />
          </div>
          <p className="mt-2.5 font-mono text-xl font-bold text-on-surface">{formatSessionDuration(connectionStartedAt)}</p>
          <p className="mt-0.5 font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">RX: {messageCount} PACKETS</p>
        </div>

        <div className={cn("rounded-none glass-panel p-3 border cyber-corners bg-surface-container/60", clearanceNow > 0 && clearanceNow < 30 ? "border-error/30 cyber-corners-error" : "border-primary/20")}>
          <div className="flex items-center justify-between">
            <span className={cn("font-mono text-[9px] font-black uppercase tracking-widest", clearanceNow > 0 && clearanceNow < 30 ? "text-error glow-text-error" : "text-primary glow-text-primary")}>[ MIN_PROXIMITY ]</span>
            {clearanceNow > 0 && clearanceNow < 30 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-error animate-pulse" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <p className="mt-2.5 font-mono text-xl font-bold text-on-surface">{clearanceNow > 0 ? `${clearanceNow.toFixed(0)} CM` : '--'}</p>
          <p className="mt-0.5 font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">CRITICAL_RANGE</p>
        </div>

        <div className="rounded-none glass-panel p-3 border border-tertiary/20 cyber-corners-tertiary bg-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-tertiary glow-text-tertiary">[ RPM_DELTA ]</span>
            <Activity className="w-3.5 h-3.5 text-tertiary" />
          </div>
          <p className="mt-2.5 font-mono text-xl font-bold text-on-surface">{rpmBalance.toFixed(0)}</p>
          <p className="mt-0.5 font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">ABS( L - R ) SHIFT</p>
        </div>

        <div className="rounded-none glass-panel p-3 border border-primary/20 cyber-corners bg-surface-container/60">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary glow-text-primary">[ KERNEL_STATE ]</span>
            <Radio className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="mt-2.5 font-mono text-sm font-bold text-on-surface glow-text-primary truncate">
            {connected ? (robotReady ? 'OK_RUNNING' : 'AWAIT_SYNC') : 'OFFLINE'}
          </p>
          <p className="mt-0.5 font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">
            {isLeader ? 'LDR' : 'OBS'} // {autopilotEnabled ? 'AUTO' : 'MAN'}
          </p>
        </div>
      </div>

      {/* Historical Telemetry Graph */}
      <div className="rounded-none glass-panel p-4 border border-primary/20 cyber-corners bg-surface-container/60 relative" id="data-trend-chart">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-primary/30 uppercase font-black">GRAPH_FEED_01</div>
        <div className="flex items-center justify-between border-b border-primary/10 pb-2">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary glow-text-primary">[ TELEMETRY_TRENDS ]</h3>
          <span className="font-mono text-[8px] text-on-surface-variant uppercase tracking-wider">µ_RPM:{avgRpm.toFixed(0)} | RISK:{autopilotRisk.toFixed(0)}%</span>
        </div>
        <div className="h-52 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedTrend}>
              <CartesianGrid stroke="rgba(0, 240, 255, 0.05)" vertical={false} strokeDasharray="2 2" />
              <XAxis dataKey="idx" hide />
              <YAxis yAxisId="rpm" stroke="var(--color-primary)" tick={{ fontSize: 9, fill: 'var(--color-primary)' }} width={25} axisLine={false} tickLine={false} />
              <YAxis yAxisId="dist" orientation="right" stroke="var(--color-secondary)" tick={{ fontSize: 9, fill: 'var(--color-secondary)' }} width={25} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6, 10, 22, 0.95)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: '0px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Line yAxisId="rpm" type="step" dataKey="left" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line yAxisId="rpm" type="step" dataKey="right" stroke="#4a80ff" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              <Line yAxisId="dist" type="monotone" dataKey="clearance" stroke="var(--color-secondary)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="dist" type="monotone" dataKey="risk" stroke="var(--color-error)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Snapshot Sonar Array */}
      <div className="rounded-none glass-panel p-4 border border-secondary/20 cyber-corners-secondary bg-surface-container/60 relative" id="distance-bars-chart">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-secondary/30 uppercase font-black">GRAPH_FEED_02</div>
        <div className="border-b border-secondary/10 pb-2">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary glow-text-secondary">[ SONAR_SNAPSHOT ]</h3>
        </div>
        <div className="h-28 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distanceBars}>
              <CartesianGrid stroke="rgba(57, 255, 20, 0.05)" vertical={false} strokeDasharray="2 2" />
              <XAxis dataKey="axis" stroke="var(--color-secondary)" tick={{ fontSize: 9, fill: 'var(--color-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--color-secondary)" tick={{ fontSize: 9, fill: 'var(--color-secondary)' }} width={25} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => `${value} CM`}
                cursor={{ fill: 'rgba(57, 255, 20, 0.1)' }}
                contentStyle={{
                  background: 'rgba(6, 10, 22, 0.95)',
                  border: '1px solid var(--color-secondary)',
                  borderRadius: '0px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
              />
              <Bar dataKey="value" fill="var(--color-secondary)" radius={[0, 0, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Event Logs */}
      <div className="rounded-none glass-panel p-4 border border-primary/20 cyber-corners bg-surface-container/60 relative" id="event-log-list">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-primary/30 uppercase font-black">SYS_LOG_BUFFER</div>
        <div className="flex items-center justify-between border-b border-primary/10 pb-2">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary glow-text-primary">[ KERNEL_EVENTS ]</h3>
          <span className="flex items-center gap-1.5 font-mono text-[8px] text-warning glow-text-warning uppercase tracking-wider font-bold">
            <AlertTriangle className="w-3 h-3 text-warning" />
            {warningCount} WARN/ERR
          </span>
        </div>
        
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-2 scrollbar-thin">
          {eventLog.length === 0 && (
            <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest animate-pulse mt-2">AWAITING SYS_EVENTS...</p>
          )}
          {[...eventLog].reverse().map((event) => (
            <div
              key={event.id}
              className={cn("border-l-2 pl-3 py-1.5 bg-black/20", levelClass(event.level))}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface-variant font-bold">
                    {new Date(event.at).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 1 })}
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-widest px-1 bg-black/40">
                    {event.source}
                  </span>
                </div>
                <span className="font-mono text-[8px] uppercase font-black tracking-widest">
                  [{event.level}]
                </span>
              </div>
              <p className="font-mono text-[10px] uppercase font-bold tracking-wide">{event.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Retro Telemetry Console and Motion Log Export Panel */}
      <div className="rounded-none glass-panel p-4 border border-secondary/30 bg-black/60 cyber-corners-secondary select-none relative" id="motion-telemetry-console">
        <div className="absolute top-0.5 right-1.5 text-[6px] text-secondary/30 uppercase font-black">MEM_DUMP_0x4F</div>
        <div className="flex items-center justify-between border-b border-secondary/20 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-secondary animate-pulse" />
            <h3 className="font-mono text-[10px] font-black uppercase tracking-widest text-secondary glow-text-secondary">[ MOTION_TRACK_CONSOLE ]</h3>
          </div>
          <span className="font-mono text-[8px] text-secondary uppercase font-bold">SYS_BUFFER: {motionLog.length} FRAMES</span>
        </div>

        <p className="text-[8px] font-mono text-secondary/80 mb-3 leading-relaxed uppercase tracking-wider">
          // CAPTURE HIGH-RESOLUTION DIFFERENTIAL VECTORS, RAMP ACCELERATIONS, PID YAW CORRECTIONS, AND ODOMETRY TO EXPORT LOGS FOR COOPERATIVE LLM DIAGNOSTICS.
        </p>

        {/* Live Terminal Pre Box */}
        <div className="relative mb-4">
          <pre className="p-3 bg-[#02050a] border border-secondary/20 text-[8px] text-secondary font-mono overflow-y-auto h-48 selection:bg-secondary/25 leading-relaxed rounded-none select-text scrollbar-thin">
            {motionLog.slice(-40).map((log, i) => (
              <div key={i} className="font-mono hover:bg-secondary/10">
                {`[${log.millis}ms] T:${log.targetL},${log.targetR} | C:${log.currL},${log.currR} | RPM:${log.rpmL},${log.rpmR} | GZ:${log.yawRate} | B:${log.bias} | P:${Math.round(log.x)},${Math.round(log.y)} | H:${Math.round(log.heading)}°`}
              </div>
            ))}
            {motionLog.length === 0 && (
              <div className="text-secondary/50 animate-pulse font-bold mt-1 uppercase tracking-widest">_ // TELEMETRY_STREAM_IDLE. ACTIVATE CAPTURE FOR DATA ANALYSIS.</div>
            )}
          </pre>
          <div className="absolute top-1.5 right-2 text-[6px] text-secondary/40 uppercase font-black tracking-widest">LIVE_MONITOR</div>
        </div>

        {/* Action Controls Grid */}
        <div className="grid grid-cols-3 gap-2 font-mono">
          <button
            onClick={() => sendCommand(motionLoggingEnabled ? 'LOG_OFF' : 'LOG_ON')}
            disabled={!robotReady}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 border font-black text-[9px] uppercase tracking-widest transition-all duration-150 active:scale-[0.98]",
              !robotReady 
                ? "opacity-40 cursor-not-allowed border-secondary/10 text-secondary/30 bg-transparent" 
                : motionLoggingEnabled
                  ? "bg-error/15 border-error/50 text-error glow-text-error hover:bg-error/25"
                  : "bg-secondary/10 border-secondary/40 text-secondary glow-text-secondary hover:bg-secondary/20 glow-secondary"
            )}
          >
            {motionLoggingEnabled ? (
              <>
                <Square className="w-3.5 h-3.5 text-error fill-error/20" /> STOP_STREAM
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-secondary fill-secondary/20" /> START_CAP
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (motionLog.length === 0) return;
              const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
                JSON.stringify(motionLog, null, 2)
              )}`;
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', jsonString);
              downloadAnchor.setAttribute('download', `ASAR_motion_log_${Date.now()}.json`);
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            disabled={motionLog.length === 0}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 border font-black text-[9px] uppercase tracking-widest transition-all duration-150 active:scale-[0.98]",
              motionLog.length === 0
                ? "opacity-40 cursor-not-allowed border-secondary/10 text-secondary/30 bg-transparent"
                : "bg-primary/10 border-primary/40 text-primary glow-text-primary hover:bg-primary/20 glow-primary"
            )}
          >
            <Download className="w-3.5 h-3.5" /> DUMP_LOG
          </button>

          <button
            onClick={clearMotionLog}
            disabled={motionLog.length === 0}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 border font-black text-[9px] uppercase tracking-widest transition-all duration-150 active:scale-[0.98]",
              motionLog.length === 0 
                ? "opacity-40 cursor-not-allowed border-secondary/10 text-secondary/30 bg-transparent" 
                : "border-warning/40 bg-warning/10 text-warning glow-text-warning hover:bg-warning/20"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" /> FORMAT_MEM
          </button>
        </div>
      </div>
    </section>
  );
}
