import { Menu, Wifi } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  robotReady: boolean;
}

export default function Header({ connected, robotReady }: HeaderProps) {
  const status = connected && robotReady ? 'LIVE' : connected ? 'LINKING...' : 'OFFLINE';
  const wifiClass = connected && robotReady ? 'text-secondary' : connected ? 'text-yellow-400 animate-pulse' : 'text-error';

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" id="menu-btn">
          <Menu className="w-6 h-6 text-on-surface-variant" />
        </button>
        <h1 className="font-sans font-bold text-xl tracking-tight uppercase" id="app-title">
          System Command
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Wifi className={`w-5 h-5 ${wifiClass}`} />
        <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">{status}</span>
      </div>
    </header>
  );
}
