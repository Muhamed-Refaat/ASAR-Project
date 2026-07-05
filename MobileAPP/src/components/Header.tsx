import { Terminal, Wifi } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  robotReady: boolean;
}

export default function Header({ connected, robotReady }: HeaderProps) {
  const status = connected && robotReady ? 'SYS_ONLINE' : connected ? 'LINKING...' : 'OFFLINE_DIS';
  const wifiClass = connected && robotReady ? 'text-secondary glow-text-secondary' : connected ? 'text-warning animate-pulse' : 'text-error glow-text-error';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-surface/90 backdrop-blur-md sticky top-0 z-50 font-mono select-none crt-flicker">
      <div className="flex items-center gap-3">
        <div className="p-2 border border-primary/30 bg-primary/5 text-primary">
          <Terminal className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-sm tracking-widest text-primary uppercase glow-text-primary" id="app-title">
            [ ASAR-4WD.OS ]
          </h1>
          <span className="text-[8px] text-on-surface-variant tracking-wider uppercase">ROBOTICS GATEWAY V6.02</span>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-surface-container px-3 py-1.5 border border-primary/10">
        <Wifi className={`w-4 h-4 ${wifiClass}`} />
        <span className={`text-[10px] font-bold tracking-widest uppercase ${connected && robotReady ? 'text-secondary glow-text-secondary' : 'text-on-surface-variant'}`}>{status}</span>
      </div>
    </header>
  );
}
