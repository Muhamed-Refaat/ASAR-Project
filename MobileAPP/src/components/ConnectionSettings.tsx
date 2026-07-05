import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Sliders, Activity, Radio, HardDrive, Cpu, ShieldCheck } from 'lucide-react';
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

  const sliderTrackClass = "w-full accent-primary h-1 bg-surface-container border border-primary/10 appearance-none cursor-pointer";

  return (
    <div className="mx-4 mt-6 space-y-4 font-mono select-none crt-flicker mb-28">
      {/* Automated Multi-Route Connection Settings */}
      <section className="glass-panel p-5 space-y-4 border border-primary/20 cyber-corners bg-surface-container/60">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary glow-text-primary">[ CONNECTION_GATEWAY ]</h3>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider leading-relaxed">
          The app attempts local direct binding, falling back dynamically to the remote WebSocket relay if unreachable.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[9px] mb-1.5 text-on-surface-variant uppercase tracking-widest">ESP32_DIRECT_WS_IP</label>
            <input
              value={directIp}
              onChange={(event) => {
                const val = event.target.value.trim();
                setDirectIp(val);
                onDirectUrlChange(val);
              }}
              disabled={connected || isConnecting}
              className="w-full bg-black/40 border border-primary/15 px-3 py-2 text-xs outline-none focus:border-primary disabled:opacity-40"
              placeholder="ws://192.168.1.100:81"
            />
          </div>

          <div>
            <label className="block text-[9px] mb-1.5 text-on-surface-variant uppercase tracking-widest">RELAY_BACKEND_HOST</label>
            <input
              value={relayHost}
              onChange={(event) => {
                const val = event.target.value.trim();
                setRelayHost(val);
                onRelayUrlChange(val);
              }}
              disabled={connected || isConnecting}
              className="w-full bg-black/40 border border-primary/15 px-3 py-2 text-xs outline-none focus:border-primary disabled:opacity-40"
              placeholder="ws://localhost:3001/ws"
            />
          </div>
        </div>

        {connected ? (
          <button
            onClick={onDisconnect}
            className="w-full py-2.5 border border-error text-error bg-error/15 font-sans text-xs font-black uppercase hover:bg-error/25 tracking-widest transition-all cursor-pointer active:scale-[0.98]"
          >
            DISCONNECT_COM_LINK
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className={cn(
              "w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-[0.98]",
              isConnecting 
                ? "bg-warning/20 border-warning text-warning cursor-wait animate-pulse" 
                : "bg-primary/15 border-primary text-primary hover:bg-primary/25"
            )}
          >
            {isConnecting 
              ? `LINKING_${currentAttemptMode === 'direct' ? 'PROBING_DIRECT' : 'FALLBACK_RELAY'}...` 
              : 'ESTABLISH_COM_LINK'}
          </button>
        )}
      </section>

      {/* Connection Status Monitor */}
      <section className="glass-panel p-4 border border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Active Connection Topology</p>
            <p className={cn('mt-1 text-xs font-black uppercase tracking-widest', connected ? 'text-secondary glow-text-secondary' : 'text-error glow-text-error')}>
              {connected 
                ? `LINKED // ${connectionMode === 'direct' ? 'DIRECT_GATEWAY' : 'RELAY_PROXY_SERVER'}` 
                : 'DISCONNECTED // OFFLINE'}
            </p>
          </div>
          {connected && (
            <button
              onClick={onDisconnect}
              className="px-3 py-1 border border-error bg-error/10 text-error text-[10px] font-black uppercase tracking-wider"
            >
              TERM_LINK
            </button>
          )}
        </div>
      </section>

      {/* Configuration Profiles & Presets */}
      <section className="glass-panel p-5 border border-primary/20 cyber-corners bg-surface-container/60">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 glow-text-primary">
          <Sliders className="w-4 h-4" /> [ CALIBRATION_PROFILES ]
        </h3>
        <p className="mt-2 text-[10px] text-on-surface-variant leading-relaxed uppercase">
          Inject system-wide operational parameter presets directly to the microcontroller.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPreset('balanced')}
            disabled={!connected}
            className="py-2.5 border border-primary/15 hover:border-primary bg-surface-container hover:bg-primary/10 text-on-surface flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
          >
            <span className="text-[10px] font-black uppercase">STANDARD</span>
            <span className="text-[7px] text-on-surface-variant uppercase">BALANCED</span>
          </button>
          <button
            onClick={() => applyPreset('aggressive')}
            disabled={!connected}
            className="py-2.5 border border-secondary/15 hover:border-secondary bg-surface-container hover:bg-secondary/10 text-on-surface flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
          >
            <span className="text-[10px] font-black uppercase text-secondary glow-text-secondary">FAST_AVD</span>
            <span className="text-[7px] text-on-surface-variant uppercase">AGILE</span>
          </button>
          <button
            onClick={() => applyPreset('cautious')}
            disabled={!connected}
            className="py-2.5 border border-tertiary/15 hover:border-tertiary bg-surface-container hover:bg-tertiary/10 text-on-surface flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
          >
            <span className="text-[10px] font-black uppercase text-tertiary glow-text-tertiary">SAFE_SPS</span>
            <span className="text-[7px] text-on-surface-variant uppercase">CAUTIOUS</span>
          </button>
        </div>

        <button
          onClick={applyAllConfigs}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]',
            connected ? 'bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25' : 'bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed',
          )}
        >
          APPLY CALIBRATION MATRIX
        </button>
      </section>

      {/* Group 1: Obstacle Avoidance (AutoPilot) */}
      <section className="glass-panel p-5 space-y-4 border border-primary/10">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">// AUTOPILOT NAVIGATION MATRIX</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] uppercase text-on-surface-variant mb-2">
              <span>Cruise Thrust Speed</span>
              <span className="font-bold text-primary glow-text-primary">{cruiseSpeed} PWM</span>
            </div>
            <input
              type="range" min={60} max={220} value={cruiseSpeed}
              onChange={(e) => setCruiseSpeed(Number(e.target.value))}
              disabled={!connected}
              className={sliderTrackClass}
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] uppercase text-on-surface-variant mb-2">
              <span>Steering Turn Speed</span>
              <span className="font-bold text-primary glow-text-primary">{turnSpeed} PWM</span>
            </div>
            <input
              type="range" min={90} max={255} value={turnSpeed}
              onChange={(e) => setTurnSpeed(Number(e.target.value))}
              disabled={!connected}
              className={sliderTrackClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Safe Threshold</span>
                <span className="font-bold text-secondary glow-text-secondary">{minFrontCm}cm</span>
              </div>
              <input
                type="range" min={10} max={80} value={minFrontCm}
                onChange={(e) => handleMinFrontChange(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Caution Zone</span>
                <span className="font-bold text-warning glow-text-warning">{cautionFrontCm}cm</span>
              </div>
              <input
                type="range" min={14} max={140} value={cautionFrontCm}
                onChange={(e) => handleCautionFrontChange(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] uppercase text-on-surface-variant mb-2">
              <span>Reverse Escape Speed</span>
              <span className="font-bold text-primary glow-text-primary">{reverseSpeed} PWM</span>
            </div>
            <input
              type="range" min={70} max={200} value={reverseSpeed}
              onChange={(e) => setReverseSpeed(Number(e.target.value))}
              disabled={!connected}
              className={sliderTrackClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Reverse Pulse</span>
                <span className="font-bold text-primary glow-text-primary">{reverseMs}ms</span>
              </div>
              <input
                type="range" min={120} max={1500} step={20} value={reverseMs}
                onChange={(e) => setReverseMs(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Turn Pulse</span>
                <span className="font-bold text-primary glow-text-primary">{turnMs}ms</span>
              </div>
              <input
                type="range" min={120} max={1800} step={20} value={turnMs}
                onChange={(e) => setTurnMs(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] uppercase text-on-surface-variant mb-2">
              <span>Odometry Steer Side Bias</span>
              <span className="font-bold text-primary glow-text-primary">{sideBias > 0 ? `RIGHT (+${sideBias})` : sideBias < 0 ? `LEFT (${sideBias})` : 'NEUTRAL_ZERO'}</span>
            </div>
            <input
              type="range" min={-100} max={100} value={sideBias}
              onChange={(e) => setSideBias(Number(e.target.value))}
              disabled={!connected}
              className={sliderTrackClass}
            />
          </div>
        </div>

        <button
          onClick={applyAutoConfig}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]',
            connected ? 'bg-secondary/15 border-secondary text-secondary glow-secondary hover:bg-secondary/25' : 'bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed',
          )}
        >
          APPLY NAVIGATION CALIBRATION
        </button>
      </section>

      {/* Group 2: IMU Calibration & Damping (MPU-6050) */}
      <section className="glass-panel p-5 space-y-4 border border-primary/10">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">// IMU VIBRATION SILENCING FILTERS</h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Accel Threshold</span>
                <span className="font-bold text-primary glow-text-primary">{accelThr}</span>
              </div>
              <input
                type="range" min={50} max={8000} step={50} value={accelThr}
                onChange={(e) => setAccelThr(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Gyro Threshold</span>
                <span className="font-bold text-primary glow-text-primary">{gyroThr}</span>
              </div>
              <input
                type="range" min={10} max={4000} step={10} value={gyroThr}
                onChange={(e) => setGyroThr(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Smoothing Factor</span>
                <span className="font-bold text-primary glow-text-primary">{alphaPct}%</span>
              </div>
              <input
                type="range" min={5} max={95} value={alphaPct}
                onChange={(e) => setAlphaPct(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
            <div>
              <div className="flex justify-between text-[9px] uppercase text-on-surface-variant mb-2">
                <span>Telemetry Interval</span>
                <span className="font-bold text-primary glow-text-primary">{reportMs}ms</span>
              </div>
              <input
                type="range" min={50} max={1000} step={10} value={reportMs}
                onChange={(e) => setReportMs(Number(e.target.value))}
                disabled={!connected}
                className={sliderTrackClass}
              />
            </div>
          </div>
        </div>

        <button
          onClick={applyMpuConfig}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]',
            connected ? 'bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25' : 'bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed',
          )}
        >
          APPLY IMU VIBRATION MATRIX
        </button>
      </section>

      {/* Group 3: Local Safety Indicators */}
      <section className="glass-panel p-5 space-y-4 border border-primary/10">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">// LOCAL SAFETY SIGNALS</h3>

        <div>
          <div className="flex justify-between text-[10px] uppercase text-on-surface-variant mb-2">
            <span>Buzzer Alert Trigger Distance</span>
            <span className="font-bold text-error glow-text-error">{warnDist}cm</span>
          </div>
          <input
            type="range" min={10} max={150} value={warnDist}
            onChange={(e) => setWarnDist(Number(e.target.value))}
            disabled={!connected}
            className={sliderTrackClass}
          />
        </div>

        <button
          onClick={applyWarnDist}
          disabled={!connected}
          className={cn(
            'mt-5 w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]',
            connected ? 'bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25' : 'bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed',
          )}
        >
          APPLY WARNING PARAMETERS
        </button>
      </section>

      {/* Group 4: Motor Polarities Inversion */}
      <section className="glass-panel p-5 space-y-4 border border-primary/10">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">// MOTOR POLARITY INVERSION CALIBRATION</h3>
        <p className="text-[10px] text-on-surface-variant leading-relaxed uppercase">
          Invert individual wheel spin polarities to debug physical motor wiring issues in-place.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex items-center justify-between p-2.5 border border-primary/10 bg-black/30 cursor-pointer">
            <span className="text-[9px] uppercase text-on-surface-variant">INV_FRONT_LEFT</span>
            <input
              type="checkbox"
              checked={invertFl}
              onChange={(e) => setInvertFl(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 border border-primary/10 bg-black/30 cursor-pointer">
            <span className="text-[9px] uppercase text-on-surface-variant">INV_REAR_LEFT</span>
            <input
              type="checkbox"
              checked={invertRl}
              onChange={(e) => setInvertRl(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 border border-primary/10 bg-black/30 cursor-pointer">
            <span className="text-[9px] uppercase text-on-surface-variant">INV_FRONT_RIGHT</span>
            <input
              type="checkbox"
              checked={invertFr}
              onChange={(e) => setInvertFr(e.target.checked)}
              disabled={!connected}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 border border-primary/10 bg-black/30 cursor-pointer">
            <span className="text-[9px] uppercase text-on-surface-variant">INV_REAR_RIGHT</span>
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
            'mt-5 w-full py-2.5 border font-sans text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]',
            connected ? 'bg-primary/15 border-primary text-primary glow-primary hover:bg-primary/25' : 'bg-surface-container-high border-white/5 text-on-surface-variant/40 cursor-not-allowed',
          )}
        >
          COMMIT POLARITY INVERSIONS
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
