import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Sliders } from 'lucide-react';
import IndividualWheelControl from './IndividualWheelControl';

interface ConnectionSettingsProps {
  directUrl: string;
  relayUrl: string;
  connected: boolean;
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onDirectUrlChange: (url: string) => void;
  onRelayUrlChange: (url: string) => void;
  connectionMode: 'idle' | 'direct' | 'relay';
  isConnecting: boolean;
  currentAttemptMode: 'idle' | 'direct' | 'relay';
}

export default function ConnectionSettings({
  directUrl,
  relayUrl,
  connected,
  sendCommand,
  robotReady,
  isLeader = true,
  manualLocked = false,
  onConnect,
  onDisconnect,
  onDirectUrlChange,
  onRelayUrlChange,
  connectionMode,
  isConnecting,
  currentAttemptMode,
}: ConnectionSettingsProps) {
  const [directIp, setDirectIp] = useState(() => directUrl);
  const [relayHost, setRelayHost] = useState(() => relayUrl);

  // AutoPilot Config States
  const [cruiseSpeed, setCruiseSpeed] = useState(120);
  const [turnSpeed, setTurnSpeed] = useState(180);
  const [minFrontCm, setMinFrontCm] = useState(20);
  const [cautionFrontCm, setCautionFrontCm] = useState(40);
  const [reverseSpeed, setReverseSpeed] = useState(130);
  const [reverseMs, setReverseMs] = useState(400);
  const [turnMs, setTurnMs] = useState(400);
  const [sideBias, setSideBias] = useState(0);

  // MPU Config States
  const [accelThr, setAccelThr] = useState(500);
  const [gyroThr, setGyroThr] = useState(100);
  const [alphaPct, setAlphaPct] = useState(15);
  const [reportMs, setReportMs] = useState(100);

  // Safety Indicator States
  const [warnDist, setWarnDist] = useState(25);

  // Motor Inversion States
  const [invertFl, setInvertFl] = useState(false);
  const [invertRl, setInvertRl] = useState(false);
  const [invertFr, setInvertFr] = useState(false);
  const [invertRr, setInvertRr] = useState(false);

  const applyInversions = () => {
    const cmd = `INV_CFG:${invertFl ? 1 : 0}:${invertRl ? 1 : 0}:${invertFr ? 1 : 0}:${invertRr ? 1 : 0}`;
    sendCommand(cmd);
  };

  const handleMinFrontChange = (val: number) => {
    setMinFrontCm(val);
    if (cautionFrontCm < val + 4) {
      setCautionFrontCm(val + 4);
    }
  };

  const handleCautionFrontChange = (val: number) => {
    setCautionFrontCm(Math.max(minFrontCm + 4, val));
  };

  const applyAutoConfig = () => {
    const cmd = `AUTO_CFG:${cruiseSpeed}:${turnSpeed}:${minFrontCm}:${cautionFrontCm}:${reverseSpeed}:${reverseMs}:${turnMs}:${sideBias}`;
    sendCommand(cmd);
  };

  const applyMpuConfig = () => {
    const cmd = `MPU_CFG:${accelThr}:${gyroThr}:${alphaPct}:${reportMs}`;
    sendCommand(cmd);
  };

  const applyWarnDist = () => {
    const cmd = `WARN_DIST:${warnDist}`;
    sendCommand(cmd);
  };

  const applyPreset = (presetName: 'balanced' | 'aggressive' | 'cautious') => {
    if (presetName === 'balanced') {
      setCruiseSpeed(120);
      setTurnSpeed(180);
      setMinFrontCm(20);
      setCautionFrontCm(40);
      setReverseSpeed(130);
      setReverseMs(400);
      setTurnMs(400);
      setSideBias(0);

      setAccelThr(500);
      setGyroThr(100);
      setAlphaPct(15);
      setReportMs(100);

      setWarnDist(25);
    } else if (presetName === 'aggressive') {
      setCruiseSpeed(180);
      setTurnSpeed(220);
      setMinFrontCm(30);
      setCautionFrontCm(60);
      setReverseSpeed(160);
      setReverseMs(300);
      setTurnMs(500);
      setSideBias(15);

      setAccelThr(800);
      setGyroThr(150);
      setAlphaPct(10);
      setReportMs(80);

      setWarnDist(35);
    } else if (presetName === 'cautious') {
      setCruiseSpeed(80);
      setTurnSpeed(120);
      setMinFrontCm(15);
      setCautionFrontCm(25);
      setReverseSpeed(90);
      setReverseMs(500);
      setTurnMs(300);
      setSideBias(-10);

      setAccelThr(300);
      setGyroThr(50);
      setAlphaPct(25);
      setReportMs(150);

      setWarnDist(20);
    }
  };

  const applyAllConfigs = () => {
    sendCommand(`AUTO_CFG:${cruiseSpeed}:${turnSpeed}:${minFrontCm}:${cautionFrontCm}:${reverseSpeed}:${reverseMs}:${turnMs}:${sideBias}`);
    setTimeout(() => {
      sendCommand(`MPU_CFG:${accelThr}:${gyroThr}:${alphaPct}:${reportMs}`);
    }, 120);
    setTimeout(() => {
      sendCommand(`WARN_DIST:${warnDist}`);
    }, 240);
  };

  useEffect(() => {
    setDirectIp(directUrl);
  }, [directUrl]);

  useEffect(() => {
    setRelayHost(relayUrl);
  }, [relayUrl]);

  return (
    <div className="mx-4 mt-6 space-y-4">
      {/* Automated Multi-Route Connection Settings */}
      <section className="glass-panel rounded-2xl p-5 space-y-4">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Connection Settings</h3>
        <p className="text-xs text-on-surface-variant">
          Your phone automatically tries connecting directly to the robot's local Wi-Fi first. If unreachable, it falls back to the relay backend.
        </p>

        <div>
          <label className="block text-[11px] mb-1 text-on-surface-variant font-mono uppercase tracking-wider">Direct ESP32 IP / WebSocket URL</label>
          <input
            value={directIp}
            onChange={(event) => {
              const val = event.target.value.trim();
              setDirectIp(val);
              onDirectUrlChange(val);
            }}
            disabled={connected || isConnecting}
            className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            placeholder="ws://192.168.1.100:81"
          />
        </div>

        <div>
          <label className="block text-[11px] mb-1 text-on-surface-variant font-mono uppercase tracking-wider">Relay Backend Host / WebSocket URL</label>
          <input
            value={relayHost}
            onChange={(event) => {
              const val = event.target.value.trim();
              setRelayHost(val);
              onRelayUrlChange(val);
            }}
            disabled={connected || isConnecting}
            className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            placeholder="ws://localhost:3001/ws"
          />
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="w-full py-2.5 rounded-xl bg-error text-surface font-sans text-xs font-bold uppercase hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Disconnect Robot
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={cn(
              "w-full py-2.5 rounded-xl text-surface font-sans text-xs font-bold uppercase hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer",
              isConnecting ? "bg-warning text-surface cursor-wait" : "bg-primary text-surface"
            )}
          >
            {isConnecting 
              ? `Connecting (${currentAttemptMode === 'direct' ? 'Probing Direct' : 'Trying Relay fallback'})...` 
              : 'Connect Robot'}
          </button>
        )}
      </section>

      {/* Connection Status Monitor */}
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">Active Status</p>
            <p className={cn('mt-1 font-sans text-sm font-semibold uppercase tracking-wider', connected ? 'text-secondary' : 'text-error')}>
              {connected 
                ? `Connected [${connectionMode === 'direct' ? 'Direct Mode' : 'Relay Mode'}]` 
                : 'Disconnected'}
            </p>
          </div>
          {connected && (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-xl bg-error text-surface font-sans text-xs font-bold uppercase"
            >
              Disconnect
            </button>
          )}
        </div>
      </section>

      {/* Configuration Profiles & Presets */}
      <section className="glass-panel rounded-2xl p-5 border border-primary/20">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" /> Configuration Profiles
        </h3>
        <p className="mt-1 text-xs text-on-surface-variant">Load a default parameter preset. Review and customize details below, then apply.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPreset('balanced')}
            disabled={!connected}
            className="py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-white/15 text-on-surface flex flex-col items-center justify-center gap-1 transition-all"
          >
            <span className="font-sans text-xs font-black uppercase">Standard</span>
            <span className="font-mono text-[8px] text-on-surface-variant uppercase">Balanced</span>
          </button>
          <button
            onClick={() => applyPreset('aggressive')}
            disabled={!connected}
            className="py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-white/15 text-on-surface flex flex-col items-center justify-center gap-1 transition-all"
          >
            <span className="font-sans text-xs font-black uppercase text-secondary">Agile</span>
            <span className="font-mono text-[8px] text-on-surface-variant uppercase">Fast Avoid</span>
          </button>
          <button
            onClick={() => applyPreset('cautious')}
            disabled={!connected}
            className="py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-white/5 hover:border-white/15 text-on-surface flex flex-col items-center justify-center gap-1 transition-all"
          >
            <span className="font-sans text-xs font-black uppercase text-tertiary">Cautious</span>
            <span className="font-mono text-[8px] text-on-surface-variant uppercase">Tight Space</span>
          </button>
        </div>

        <button
          onClick={applyAllConfigs}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
            connected ? 'bg-primary text-surface' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply Preset Configuration
        </button>
      </section>

      {/* Group 1: Obstacle Avoidance (AutoPilot) */}
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">AutoPilot Navigation</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Configure autonomous navigation speed, durations, and safety limits.</p>

        <div className="mt-4 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
              <span>Cruise Speed (PWM)</span>
              <span className="font-bold text-on-surface">{cruiseSpeed}</span>
            </div>
            <input
              type="range" min={60} max={220} value={cruiseSpeed}
              onChange={(e) => setCruiseSpeed(Number(e.target.value))}
              disabled={!connected}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
              <span>Turn Speed (PWM)</span>
              <span className="font-bold text-on-surface">{turnSpeed}</span>
            </div>
            <input
              type="range" min={90} max={255} value={turnSpeed}
              onChange={(e) => setTurnSpeed(Number(e.target.value))}
              disabled={!connected}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Min Front</span>
                <span className="font-bold text-on-surface">{minFrontCm}cm</span>
              </div>
              <input
                type="range" min={10} max={80} value={minFrontCm}
                onChange={(e) => handleMinFrontChange(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Caution Front</span>
                <span className="font-bold text-on-surface">{cautionFrontCm}cm</span>
              </div>
              <input
                type="range" min={14} max={140} value={cautionFrontCm}
                onChange={(e) => handleCautionFrontChange(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
              <span>Reverse Speed (PWM)</span>
              <span className="font-bold text-on-surface">{reverseSpeed}</span>
            </div>
            <input
              type="range" min={70} max={200} value={reverseSpeed}
              onChange={(e) => setReverseSpeed(Number(e.target.value))}
              disabled={!connected}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Rev Duration</span>
                <span className="font-bold text-on-surface">{reverseMs}ms</span>
              </div>
              <input
                type="range" min={120} max={1500} step={20} value={reverseMs}
                onChange={(e) => setReverseMs(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Turn Duration</span>
                <span className="font-bold text-on-surface">{turnMs}ms</span>
              </div>
              <input
                type="range" min={120} max={1800} step={20} value={turnMs}
                onChange={(e) => setTurnMs(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
              <span>Steer Side Bias</span>
              <span className="font-bold text-on-surface">{sideBias > 0 ? `Right (+${sideBias})` : sideBias < 0 ? `Left (${sideBias})` : 'Neutral (0)'}</span>
            </div>
            <input
              type="range" min={-100} max={100} value={sideBias}
              onChange={(e) => setSideBias(Number(e.target.value))}
              disabled={!connected}
              className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={applyAutoConfig}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
            connected ? 'bg-primary text-surface' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply AutoPilot Config
        </button>
      </section>

      {/* Group 2: IMU Calibration & Damping (MPU-6050) */}
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">IMU Vibration Filters</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Calibrate Complementary Filter alpha and noise damping limits.</p>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Accel Noise</span>
                <span className="font-bold text-on-surface">{accelThr}</span>
              </div>
              <input
                type="range" min={50} max={8000} step={50} value={accelThr}
                onChange={(e) => setAccelThr(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Gyro Noise</span>
                <span className="font-bold text-on-surface">{gyroThr}</span>
              </div>
              <input
                type="range" min={10} max={4000} step={10} value={gyroThr}
                onChange={(e) => setGyroThr(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>Smoothing Alpha</span>
                <span className="font-bold text-on-surface">{alphaPct}%</span>
              </div>
              <input
                type="range" min={5} max={95} value={alphaPct}
                onChange={(e) => setAlphaPct(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
                <span>IMU Interval</span>
                <span className="font-bold text-on-surface">{reportMs}ms</span>
              </div>
              <input
                type="range" min={50} max={1000} step={10} value={reportMs}
                onChange={(e) => setReportMs(Number(e.target.value))}
                disabled={!connected}
                className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <button
          onClick={applyMpuConfig}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
            connected ? 'bg-primary text-surface' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply IMU Calibration
        </button>
      </section>

      {/* Group 3: Local Safety Indicators */}
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Safety Signals</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Configure onboard warning indicators and hardware alert distances.</p>

        <div className="mt-4">
          <div className="flex justify-between text-xs font-mono uppercase text-on-surface-variant mb-1">
            <span>Alert Alarm Distance</span>
            <span className="font-bold text-on-surface">{warnDist}cm</span>
          </div>
          <input
            type="range" min={10} max={150} value={warnDist}
            onChange={(e) => setWarnDist(Number(e.target.value))}
            disabled={!connected}
            className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          onClick={applyWarnDist}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
            connected ? 'bg-primary text-surface' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply Warning Distance
        </button>
      </section>

      {/* Group 4: Motor Polarities Inversion */}
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Motor Polarities</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Calibrate wheel direction inversion on-the-fly to solve "sideways sliding / sidewalk" wiring issues.</p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-white/5 cursor-pointer">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant">Invert FL</span>
            <input
              type="checkbox"
              checked={invertFl}
              onChange={(e) => setInvertFl(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-white/5 cursor-pointer">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant">Invert RL</span>
            <input
              type="checkbox"
              checked={invertRl}
              onChange={(e) => setInvertRl(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-white/5 cursor-pointer">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant">Invert FR</span>
            <input
              type="checkbox"
              checked={invertFr}
              onChange={(e) => setInvertFr(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-white/5 cursor-pointer">
            <span className="font-mono text-[10px] uppercase text-on-surface-variant">Invert RR</span>
            <input
              type="checkbox"
              checked={invertRr}
              onChange={(e) => setInvertRr(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <button
          onClick={applyInversions}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
            connected ? 'bg-primary text-surface hover:brightness-110 active:scale-[0.98]' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply Motor Polarities
        </button>
      </section>

      <IndividualWheelControl
        sendCommand={sendCommand}
        robotReady={robotReady}
        isLeader={isLeader}
        manualLocked={manualLocked}
        className="mx-0 mt-0"
      />
    </div>
  );
}
