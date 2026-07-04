import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Sliders } from 'lucide-react';
import IndividualWheelControl from './IndividualWheelControl';

type ConnectionMode = 'direct' | 'relay';

interface ConnectionSettingsProps {
  directUrl: string;
  relayUrl: string;
  connected: boolean;
  sendCommand: (cmd: string) => void;
  robotReady: boolean;
  isLeader?: boolean;
  manualLocked?: boolean;
  onConnect: (url: string, mode: ConnectionMode) => void;
  onDisconnect: () => void;
  onDirectUrlChange: (url: string) => void;
  onRelayUrlChange: (url: string) => void;
}

function extractDirectIp(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || '192.168.1.100';
  } catch {
    return (url || '192.168.1.100').replace(/^wss?:\/\//, '').replace(/:\d+.*$/, '');
  }
}

function extractRelayHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host || 'localhost:3001';
  } catch {
    return (url || 'localhost:3001').replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
  }
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
    // Send AutoPilot Config
    sendCommand(`AUTO_CFG:${cruiseSpeed}:${turnSpeed}:${minFrontCm}:${cautionFrontCm}:${reverseSpeed}:${reverseMs}:${turnMs}:${sideBias}`);
    // Send IMU Config sequentially to prevent buffer collision
    setTimeout(() => {
      sendCommand(`MPU_CFG:${accelThr}:${gyroThr}:${alphaPct}:${reportMs}`);
    }, 120);
    // Send Safety Config sequentially
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
      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Direct ESP32</h3>
        <label className="block text-[11px] mt-3 mb-1 text-on-surface-variant font-mono uppercase tracking-wider">ESP32 IP / WebSocket URL</label>
        <input
          value={directIp}
          onChange={(event) => {
            const val = event.target.value.trim();
            setDirectIp(val);
            onDirectUrlChange(val);
          }}
          className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="ws://192.168.1.100:81"
        />
        <p className="mt-2 font-mono text-[11px] text-on-surface-variant">URL: {directIp}</p>
        <p className="mt-2 text-xs text-on-surface-variant">Tip: You can also try ws://robot.local:81 on local Wi-Fi.</p>
        <button
          onClick={() => onConnect(directIp, 'direct')}
          disabled={connected}
          className={cn(
            "mt-3 w-full py-2.5 rounded-xl bg-primary text-surface font-sans text-xs font-bold uppercase hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer",
            connected && "opacity-40 cursor-not-allowed hover:brightness-100 active:scale-100"
          )}
        >
          Connect Direct
        </button>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Relay Backend</h3>
        <label className="block text-[11px] mt-3 mb-1 text-on-surface-variant font-mono uppercase tracking-wider">Relay Host / WebSocket URL</label>
        <input
          value={relayHost}
          onChange={(event) => {
            const val = event.target.value.trim();
            setRelayHost(val);
            onRelayUrlChange(val);
          }}
          className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="ws://localhost:3001/ws"
        />
        <p className="mt-2 font-mono text-[11px] text-on-surface-variant">URL: {relayHost}</p>
        <p className="mt-2 text-xs text-on-surface-variant">Tip: Use relay mode when controlling over the internet.</p>
        <button
          onClick={() => onConnect(relayHost, 'relay')}
          disabled={connected}
          className={cn(
            "mt-3 w-full py-2.5 rounded-xl bg-primary text-surface font-sans text-xs font-bold uppercase hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer",
            connected && "opacity-40 cursor-not-allowed hover:brightness-100 active:scale-100"
          )}
        >
          Connect Relay
        </button>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</p>
            <p className={cn('mt-1 font-sans text-sm font-semibold', connected ? 'text-secondary' : 'text-error')}>
              {connected ? 'Connected' : 'Disconnected'}
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
            'mt-4 w-full py-3 rounded-xl font-sans text-xs font-black uppercase tracking-wider transition-all',
            connected ? 'bg-primary text-surface hover:brightness-110 shadow-lg' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
          )}
        >
          Apply All Configs to Robot
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
