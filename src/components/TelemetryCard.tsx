import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface TelemetryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  status?: "normal" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
}

export const TelemetryCard = ({ 
  title, 
  value, 
  unit, 
  icon, 
  status = "normal",
  trend = "stable" 
}: TelemetryCardProps) => {
  const statusColors = {
    normal: "border-success/50 bg-success/5",
    warning: "border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5 glow-warning",
    critical: "border-destructive/50 bg-destructive/5 glow-danger"
  };

  const trendIndicators = {
    up: "↗",
    down: "↘",
    stable: "→"
  };

  return (
    <Card className={`p-4 border-2 transition-all duration-300 hover:scale-105 ${statusColors[status]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-xs font-mono text-muted-foreground">
          {trendIndicators[trend]}
        </span>
      </div>
      <h3 className="text-sm text-muted-foreground mb-1">{title}</h3>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold monospace">{value}</span>
        {unit && <span className="text-sm text-muted-foreground monospace">{unit}</span>}
      </div>
    </Card>
  );
};
