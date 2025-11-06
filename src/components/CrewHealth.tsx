import { Heart, Brain, Activity } from "lucide-react";
import { useMemo } from "react";
import { useTelemetry } from "@/hooks/use-telemetry";
import { Card } from "@/components/ui/card";
import { TelemetryTrendChart } from "./TelemetryTrendChart";

const CREW_PALETTE = ["#c084fc", "#38bdf8", "#f97316", "#22c55e", "#f43f5e"];

const determineStatus = (heartRate: number, stress: number, fatigue: number) => {
  if (heartRate > 90 || stress > 70 || fatigue > 80) return "critical";
  if (heartRate > 80 || stress > 50 || fatigue > 60) return "warning";
  return "normal";
};

export const CrewHealth = () => {
  const { crew, crewHistory } = useTelemetry();

  const crewColorConfig = useMemo(
    () =>
      crew.map((member, index) => ({
        id: member.id,
        name: member.name,
        color: CREW_PALETTE[index % CREW_PALETTE.length],
      })),
    [crew],
  );

  const heartRateHistory = useMemo(() => {
    return crewHistory.map((entry) => {
      const row: Record<string, number | string | null> = { time: entry.time };
      crewColorConfig.forEach((member) => {
        row[member.id] = entry.metrics[member.id]?.heartRate ?? null;
      });
      return row;
    });
  }, [crewColorConfig, crewHistory]);

  const stressHistory = useMemo(() => {
    return crewHistory.map((entry) => {
      const row: Record<string, number | string | null> = { time: entry.time };
      crewColorConfig.forEach((member) => {
        row[member.id] = entry.metrics[member.id]?.stress ?? null;
      });
      return row;
    });
  }, [crewColorConfig, crewHistory]);

  const fatigueHistory = useMemo(() => {
    return crewHistory.map((entry) => {
      const row: Record<string, number | string | null> = { time: entry.time };
      crewColorConfig.forEach((member) => {
        row[member.id] = entry.metrics[member.id]?.fatigue ?? null;
      });
      return row;
    });
  }, [crewColorConfig, crewHistory]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Crew Health Monitoring</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {crew.map((member) => {
          const status = determineStatus(member.heartRate, member.stress, member.fatigue);

          return (
            <Card
              key={member.id}
              className="p-4 border-2 border-border hover:border-primary/50 transition-all"
            >
              <h3 className="font-semibold mb-3 text-sm">{member.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">Heart Rate</span>
                  </div>
                  <span className="font-mono font-bold">{member.heartRate.toFixed(0)} bpm</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[hsl(var(--warning))]" />
                    <span className="text-xs text-muted-foreground">Stress</span>
                  </div>
                  <span className="font-mono font-bold">{member.stress.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Fatigue</span>
                  </div>
                  <span className="font-mono font-bold">{member.fatigue.toFixed(0)}%</span>
                </div>
                <div
                  className={`mt-2 px-2 py-1 rounded text-xs font-semibold text-center ${
                    status === "critical"
                      ? "bg-destructive/20 text-destructive"
                      : status === "warning"
                        ? "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                        : "bg-success/20 text-success"
                  }`}
                >
                  {status.toUpperCase()}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <TelemetryTrendChart
          title="Heart Rate Trends"
          data={heartRateHistory}
          series={crewColorConfig.map((member) => ({
            dataKey: member.id,
            label: member.name,
            color: member.color,
            unit: "bpm",
            precision: 0,
          }))}
          yTickFormatter={(value) => value.toFixed(0)}
        />
        <TelemetryTrendChart
          title="Stress Levels"
          data={stressHistory}
          series={crewColorConfig.map((member) => ({
            dataKey: member.id,
            label: member.name,
            color: member.color,
            unit: "%",
            precision: 0,
          }))}
          yTickFormatter={(value) => value.toFixed(0)}
        />
        <TelemetryTrendChart
          title="Fatigue Levels"
          data={fatigueHistory}
          series={crewColorConfig.map((member) => ({
            dataKey: member.id,
            label: member.name,
            color: member.color,
            unit: "%",
            precision: 0,
          }))}
          yTickFormatter={(value) => value.toFixed(0)}
        />
      </div>
    </div>
  );
};
