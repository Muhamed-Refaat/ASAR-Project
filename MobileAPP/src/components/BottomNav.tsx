import { LayoutDashboard, Settings, ToyBrick, Activity, Wrench } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface BottomNavProps {
  active: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ active, onTabChange }: BottomNavProps) {
  const navItems = [
    { id: 'drive', label: 'Drive', icon: LayoutDashboard },
    { id: 'auto', label: 'Auto', icon: ToyBrick },
    { id: 'diagnostics', label: 'Diag', icon: Wrench },
    { id: 'data', label: 'Data', icon: Activity },
    { id: 'config', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-primary/20 pb-6 pt-3 px-4 flex items-center justify-between z-50 font-mono select-none crt-flicker">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all flex-1 py-1.5 relative",
              isActive ? "text-primary glow-text-primary" : "text-on-surface-variant hover:text-on-surface"
            )}
            id={`nav-${item.id}`}
          >
            {/* Cyber bracket active background marker */}
            {isActive && (
              <div className="absolute inset-x-2 inset-y-0 border-t-2 border-primary/40 pointer-events-none" />
            )}

            <div className={cn(
              "p-1.5 transition-all",
              isActive && "bg-primary/10 border border-primary/30 glow-primary"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
