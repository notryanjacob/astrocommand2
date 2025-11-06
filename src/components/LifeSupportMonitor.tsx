import { Wind, Droplets, Thermometer, Gauge } from "lucide-react";
import { useMemo } from "react";
import { useTelemetry } from "@/hooks/use-telemetry";
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

export const LifeSupportMonitor = () => {
  const { lifeSupport, lifeSupportHistory } = useTelemetry();

  const previousSample =
    lifeSupportHistory.length > 1 ? lifeSupportHistory[lifeSupportHistory.length - 2] : undefined;

  const co2Percent = lifeSupport.co2 * 100;
  const chartData = useMemo(() => lifeSupportHistory, [lifeSupportHistory]);

  const getO2Status = (value: number) => {
    if (value < 19.5 || value > 23) return "critical";
    if (value < 20 || value > 22) return "warning";
    return "normal";
  };

  const getCO2Status = (value: number) => {
    if (value > 0.08) return "critical";
    if (value > 0.06) return "warning";
    return "normal";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">Life Support Systems</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TelemetryCard
          title="Oxygen Level"
          value={lifeSupport.oxygen.toFixed(1)}
          unit="%"
          icon={<Wind className="w-5 h-5" />}
          status={getO2Status(lifeSupport.oxygen)}
          trend={determineTrend(lifeSupport.oxygen, previousSample?.oxygen, 0.1)}
        />
        <TelemetryCard
          title="CO₂ Level"
          value={co2Percent.toFixed(2)}
          unit="%"
          icon={<Wind className="w-5 h-5" />}
          status={getCO2Status(lifeSupport.co2)}
          trend={determineTrend(co2Percent, previousSample?.co2, 0.02)}
        />
        <TelemetryCard
          title="Humidity"
          value={lifeSupport.humidity.toFixed(0)}
          unit="%"
          icon={<Droplets className="w-5 h-5" />}
          status="normal"
          trend={determineTrend(lifeSupport.humidity, previousSample?.humidity, 1)}
        />
        <TelemetryCard
          title="Temperature"
          value={lifeSupport.temperature.toFixed(1)}
          unit="°C"
          icon={<Thermometer className="w-5 h-5" />}
          status="normal"
          trend={determineTrend(lifeSupport.temperature, previousSample?.temperature, 0.2)}
        />
        <TelemetryCard
          title="Hull Pressure"
          value={lifeSupport.pressure.toFixed(1)}
          unit="kPa"
          icon={<Gauge className="w-5 h-5" />}
          status="normal"
          trend={determineTrend(lifeSupport.pressure, previousSample?.pressure, 0.05)}
        />
      </div>
      <TelemetryTrendChart
        title="Life Support Trends"
        data={chartData}
        series={[
          {
            dataKey: "oxygen",
            label: "Oxygen",
            color: "hsl(var(--success))",
            unit: "%",
            precision: 1,
          },
          {
            dataKey: "co2",
            label: "CO₂",
            color: "hsl(var(--destructive))",
            unit: "%",
            precision: 2,
          },
          {
            dataKey: "humidity",
            label: "Humidity",
            color: "hsl(var(--primary))",
            unit: "%",
            precision: 0,
          },
          {
            dataKey: "temperature",
            label: "Temperature",
            color: "hsl(var(--muted-foreground))",
            unit: "°C",
            precision: 1,
          },
          {
            dataKey: "pressure",
            label: "Hull Pressure",
            color: "#f97316",
            unit: "kPa",
            precision: 1,
          },
        ]}
        yTickFormatter={(value) =>
          value.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })
        }
      />
    </div>
  );
};
