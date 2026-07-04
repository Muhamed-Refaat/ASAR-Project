import { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';

type ConnectionMode = 'direct' | 'relay';

interface ConnectionSettingsProps {
  connectionMode: ConnectionMode;
  directUrl: string;
  relayUrl: string;
  connected: boolean;
  maxSpeed: number;
  maxSpeedAck: number | null;
  onConnect: (url: string, mode: ConnectionMode) => void;
  onDisconnect: () => void;
  onModeChange: (mode: ConnectionMode) => void;
  onDirectUrlChange: (url: string) => void;
  onRelayUrlChange: (url: string) => void;
  onApplyMaxSpeed: (speed: number) => void;
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
  connectionMode,
  directUrl,
  relayUrl,
  connected,
  maxSpeed,
  maxSpeedAck,
  onConnect,
  onDisconnect,
  onModeChange,
  onDirectUrlChange,
  onRelayUrlChange,
  onApplyMaxSpeed,
}: ConnectionSettingsProps) {
  const [directIp, setDirectIp] = useState(() => extractDirectIp(directUrl));
  const [relayHost, setRelayHost] = useState(() => extractRelayHost(relayUrl));
  const [localMaxSpeed, setLocalMaxSpeed] = useState(maxSpeed);

  useEffect(() => {
    setDirectIp(extractDirectIp(directUrl));
  }, [directUrl]);

  useEffect(() => {
    setRelayHost(extractRelayHost(relayUrl));
  }, [relayUrl]);

  const directPreview = `ws://${directIp}:81`;
  // If the user typed a full URL (starting with ws/wss), use it directly; otherwise prefix with ws://
  const relayPreview = /^wss?:\/\//i.test(relayHost)
    ? relayHost.replace(/\/$/, '') + '/ws'
    : `ws://${relayHost}/ws`;

  return (
    <div className="mx-4 mt-6 space-y-4">
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="font-sans font-bold text-lg uppercase tracking-wide text-on-surface">Connection Mode</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('direct')}
            className={cn(
              'py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
              connectionMode === 'direct' ? 'bg-secondary text-surface' : 'bg-white/5 text-on-surface-variant',
            )}
          >
            Direct
          </button>
          <button
            onClick={() => onModeChange('relay')}
            className={cn(
              'py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
              connectionMode === 'relay' ? 'bg-secondary text-surface' : 'bg-white/5 text-on-surface-variant',
            )}
          >
            Relay
          </button>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Direct ESP32</h3>
        <label className="block text-[11px] mt-3 mb-1 text-on-surface-variant font-mono uppercase tracking-wider">ESP32 IP</label>
        <input
          value={directIp}
          onChange={(event) => {
            const ip = event.target.value.trim();
            setDirectIp(ip);
            onDirectUrlChange(`ws://${ip}:81`);
          }}
          className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="192.168.1.100"
        />
        <p className="mt-2 font-mono text-[11px] text-on-surface-variant">URL: {directPreview}</p>
        <p className="mt-2 text-xs text-on-surface-variant">Tip: You can also try ws://robot.local:81 on local Wi-Fi.</p>
        <button
          onClick={() => onConnect(directPreview, 'direct')}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-surface font-sans text-xs font-bold uppercase"
        >
          Connect Direct
        </button>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Relay Backend</h3>
        <label className="block text-[11px] mt-3 mb-1 text-on-surface-variant font-mono uppercase tracking-wider">Relay Host</label>
        <input
          value={relayHost}
          onChange={(event) => {
            const host = event.target.value.trim();
            setRelayHost(host);
            onRelayUrlChange(`ws://${host}/ws`);
          }}
          className="w-full rounded-xl bg-surface-container-high border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="localhost:3001"
        />
        <p className="mt-2 font-mono text-[11px] text-on-surface-variant">URL: {relayPreview}</p>
        <p className="mt-2 text-xs text-on-surface-variant">Tip: Use relay mode when controlling over the internet.</p>
        <button
          onClick={() => onConnect(relayPreview, 'relay')}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-surface font-sans text-xs font-bold uppercase"
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

      <section className="glass-panel rounded-2xl p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-primary">Robot Speed</h3>
        <p className="mt-1 text-xs text-on-surface-variant">Caps the maximum motor PWM (0 = stopped, 255 = full speed).</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={255}
            step={1}
            value={localMaxSpeed}
            onChange={(e) => setLocalMaxSpeed(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="font-mono text-sm font-bold text-on-surface w-10 text-right">{localMaxSpeed}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => onApplyMaxSpeed(localMaxSpeed)}
            disabled={!connected}
            className={cn(
              'px-5 py-2.5 rounded-xl font-sans text-xs font-bold uppercase transition-all',
              connected ? 'bg-primary text-surface' : 'bg-white/10 text-on-surface-variant cursor-not-allowed',
            )}
          >
            Apply Speed
          </button>
          {maxSpeedAck !== null && (
            <p className="font-mono text-[11px] text-secondary">
              Robot confirmed: {maxSpeedAck}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
