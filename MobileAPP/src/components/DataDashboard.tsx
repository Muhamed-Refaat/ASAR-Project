import { Activity, AlertTriangle, Radio, ShieldAlert, ShieldCheck, Timer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RobotEvent } from '../lib/useRobotConnection';

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
  if (level === 'error') return 'border-error/50 bg-error/10 text-error';
  if (level === 'warn') return 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300';
  return 'border-secondary/30 bg-secondary/10 text-secondary';
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
}: DataDashboardProps) {
  const mergedTrend = toCombinedSeries(rpmLeftHistory, rpmRightHistory, minDistanceHistory, autopilotRiskHistory);
  const clearanceNow = currentClearance([distLeft, distFront, distRight, distBack]);
  const rpmBalance = Math.abs(rpmLeft - rpmRight);
  const avgRpm = average(
    rpmLeftHistory.map((point, idx) => (point.val + (rpmRightHistory[idx]?.val ?? 0)) / 2),
  );
  const warningCount = eventLog.filter((entry) => entry.level !== 'info').length;

  const distanceBars = [
    { axis: 'L', value: distLeft },
    { axis: 'F', value: distFront },
    { axis: 'R', value: distRight },
    { axis: 'B', value: distBack },
  ];

  return (
    <section className="mx-4 mt-4 space-y-4" id="data-dashboard">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl glass-panel p-3 border border-secondary/25">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Session</span>
            <Timer className="w-4 h-4 text-secondary" />
          </div>
          <p className="mt-2 font-mono text-lg font-bold text-on-surface">{formatSessionDuration(connectionStartedAt)}</p>
          <p className="font-mono text-[10px] text-on-surface-variant">{messageCount} msgs parsed</p>
        </div>

        <div className="rounded-2xl glass-panel p-3 border border-primary/25">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Current Clearance</span>
            {clearanceNow > 0 && clearanceNow < 30 ? (
              <ShieldAlert className="w-4 h-4 text-error" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-secondary" />
            )}
          </div>
          <p className="mt-2 font-mono text-lg font-bold text-on-surface">{clearanceNow > 0 ? `${clearanceNow.toFixed(0)} cm` : '--'}</p>
          <p className="font-mono text-[10px] text-on-surface-variant">closest obstacle</p>
        </div>

        <div className="rounded-2xl glass-panel p-3 border border-tertiary/25">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">RPM Balance</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-lg font-bold text-on-surface">{rpmBalance.toFixed(0)}</p>
          <p className="font-mono text-[10px] text-on-surface-variant">delta |L-R|</p>
        </div>

        <div className="rounded-2xl glass-panel p-3 border border-white/15">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Robot State</span>
            <Radio className="w-4 h-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-sm font-bold text-on-surface">
            {connected ? (robotReady ? 'RUNNING' : 'WAITING_RDY') : 'OFFLINE'}
          </p>
          <p className="font-mono text-[10px] text-on-surface-variant">
            {isLeader ? 'leader' : 'observer'} • {autopilotEnabled ? 'auto' : 'manual'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-4" id="data-trend-chart">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Telemetry Trends</h3>
          <span className="font-mono text-[10px] text-on-surface-variant">avg rpm {avgRpm.toFixed(0)} • risk {autopilotRisk.toFixed(0)}</span>
        </div>
        <div className="h-52 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mergedTrend}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="idx" hide />
              <YAxis yAxisId="rpm" stroke="#adc6ff" tick={{ fontSize: 10 }} width={30} />
              <YAxis yAxisId="dist" orientation="right" stroke="#4edea3" tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10, 17, 34, 0.95)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
              />
              <Line yAxisId="rpm" type="monotone" dataKey="left" stroke="#82b5ff" strokeWidth={2} dot={false} />
              <Line yAxisId="rpm" type="monotone" dataKey="right" stroke="#b2c9ff" strokeWidth={2} dot={false} />
              <Line yAxisId="dist" type="monotone" dataKey="clearance" stroke="#4edea3" strokeWidth={2} dot={false} />
              <Line yAxisId="dist" type="monotone" dataKey="risk" stroke="#ffb4ab" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-4" id="distance-bars-chart">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Sensor Snapshot</h3>
        <div className="h-28 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distanceBars}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="axis" stroke="#c2c6d6" tick={{ fontSize: 10 }} />
              <YAxis stroke="#c2c6d6" tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                formatter={(value) => `${value} cm`}
                contentStyle={{
                  background: 'rgba(10, 17, 34, 0.95)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '10px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="value" fill="#4edea3" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl glass-panel p-4" id="event-log-list">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Event Log</h3>
          <span className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
            <AlertTriangle className="w-3 h-3 text-yellow-300" />
            {warningCount} alerts
          </span>
        </div>
        <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
          {eventLog.length === 0 && (
            <p className="font-mono text-[10px] text-on-surface-variant">No events yet. Connect to start recording.</p>
          )}
          {[...eventLog].reverse().map((event) => (
            <div
              key={event.id}
              className="rounded-lg border px-2.5 py-2 bg-surface-container-low/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${levelClass(event.level)}`}>
                  {event.level}
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">{new Date(event.at).toLocaleTimeString()}</span>
              </div>
              <p className="mt-1 font-mono text-[10px] text-on-surface-variant">{event.source}</p>
              <p className="mt-1 font-sans text-xs text-on-surface">{event.message}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
