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
    <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/5 pb-8 pt-3 px-6 flex items-center justify-between z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              isActive ? "text-secondary" : "text-on-surface-variant hover:text-on-surface"
            )}
            id={`nav-${item.id}`}
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              isActive && "bg-secondary/10 shadow-[0_0_15px_rgba(78,222,163,0.15)]"
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
