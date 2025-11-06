import { Battery, Sun, Zap } from "lucide-react";
import { useMemo } from "react";
import { useTelemetry } from "@/hooks/use-telemetry";
import { Progress } from "@/components/ui/progress";
import { TelemetryCard } from "./TelemetryCard";
import { TelemetryTrendChart } from "./TelemetryTrendChart";

const determineTrend = (current: number, previous?: number, tolerance = 0.05) => {
  if (previous === undefined) {
    return "stable";
  }

  if (current > previous + tolerance) {
    return "up";
  }

  if (current < previous - tolerance) {
    return "down";
  }

  return "stable";
};

export const PowerManagement = () => {
  const { power, powerHistory } = useTelemetry();
  const previousSample =
    powerHistory.length > 1 ? powerHistory[powerHistory.length - 2] : undefined;

  const chartData = useMemo(() => powerHistory, [powerHistory]);

  const getBatteryStatus = (level: number) => {
    if (level < 20) return "critical";
    if (level < 40) return "warning";
    return "normal";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Power Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TelemetryCard
          title="Solar Array Output"
          value={power.solarOutput.toFixed(0)}
          unit="kW"
          icon={<Sun className="w-5 h-5" />}
          status="normal"
          trend={determineTrend(power.solarOutput, previousSample?.solarOutput, 5)}
        />
        <TelemetryCard
          title="Power Consumption"
          value={power.consumption.toFixed(0)}
          unit="kW"
          icon={<Zap className="w-5 h-5" />}
          status="normal"
          trend={determineTrend(power.consumption, previousSample?.consumption, 4)}
        />
        <div className="space-y-2">
          <TelemetryCard
            title="Battery Level"
            value={power.batteryLevel.toFixed(0)}
            unit="%"
            icon={<Battery className="w-5 h-5" />}
            status={getBatteryStatus(power.batteryLevel)}
            trend={determineTrend(power.netPower, previousSample?.netPower, 1)}
          />
          <Progress value={power.batteryLevel} className="h-2" />
        </div>
      </div>
      <TelemetryTrendChart
        title="Power Flow"
        data={chartData}
        series={[
          {
            dataKey: "solarOutput",
            label: "Solar Output",
            color: "#22d3ee",
            unit: "kW",
            precision: 0,
          },
          {
            dataKey: "consumption",
            label: "Consumption",
            color: "#f43f5e",
            unit: "kW",
            precision: 0,
          },
          {
            dataKey: "batteryLevel",
            label: "Battery Level",
            color: "hsl(var(--primary))",
            unit: "%",
            precision: 0,
          },
          {
            dataKey: "netPower",
            label: "Net Power",
            color: "hsl(var(--success))",
            unit: "kW",
            precision: 1,
          },
        ]}
        yTickFormatter={(value) =>
          value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
        }
      />
    </div>
  );
};
