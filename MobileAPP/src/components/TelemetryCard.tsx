import { Settings2 } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface TelemetryCardProps {
  label: string;
  id: string;
  value: string;
  unit: string;
  data: { val: number }[];
  color?: string;
  cardId?: string;
}

export default function TelemetryCard({ label, id, value, unit, data, color = "#4edea3", cardId }: TelemetryCardProps) {
  return (
    <div className="mx-4 mt-4 p-5 rounded-2xl glass-panel" id={cardId}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            {label} ({id})
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="font-mono text-3xl font-bold text-on-surface" id={`${cardId}-val`}>{value}</span>
            <span className="font-mono text-[10px] text-on-surface-variant">{unit}</span>
          </div>
        </div>
        <Settings2 className="w-5 h-5 text-on-surface/20" />
      </div>

      <div className="h-16 w-full -mx-5 px-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="val" 
              stroke={color} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={`url(#gradient-${id})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
