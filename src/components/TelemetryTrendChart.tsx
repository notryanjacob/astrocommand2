import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { TooltipPayload } from "recharts";

type TelemetrySeries = {
  dataKey: string;
  label: string;
  color: string;
  unit?: string;
  precision?: number;
};

interface TelemetryTrendChartProps<T extends Record<string, unknown>> {
  title: string;
  data: (T & { time: string })[];
  series: TelemetrySeries[];
  className?: string;
  yTickFormatter?: (value: number) => string;
  timeKey?: string;
  emptyLabel?: string;
}

const defaultTickFormatter = (value: number) => {
  if (Number.isNaN(value)) {
    return "";
  }

  const isLarge = Math.abs(value) >= 100;
  const fractionDigits = isLarge ? 0 : 1;

  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

export function TelemetryTrendChart<T extends Record<string, unknown>>({
  title,
  data,
  series,
  className,
  yTickFormatter,
  timeKey = "time",
  emptyLabel = "Collecting telemetry...",
}: TelemetryTrendChartProps<T>) {
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        series.map((item) => [
          item.dataKey,
          {
            label: item.label,
            color: item.color,
          },
        ]),
      ),
    [series],
  );

  const seriesMeta = useMemo(
    () =>
      series.reduce<Record<string, TelemetrySeries>>(
        (acc, item) => ({ ...acc, [item.dataKey]: item }),
        {},
      ),
    [series],
  );

  const tooltipFormatter = (
    value: number | string,
    name: string,
    item: TooltipPayload<number | string, string> | undefined,
  ) => {
    const key = (item?.dataKey as string) || name;
    const meta = seriesMeta[key];
    const numericValue =
      typeof value === "number" ? value : Number.parseFloat(String(value));
    const precision =
      meta?.precision ??
      (Number.isFinite(numericValue)
        ? Math.abs(numericValue) >= 100
          ? 0
          : Math.abs(numericValue) >= 10
            ? 1
            : 2
        : 2);

    const formattedValue =
      Number.isFinite(numericValue)
        ? numericValue.toLocaleString(undefined, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          })
        : value;

    return (
      <div className="flex w-full items-center justify-between gap-4">
        <span className="text-muted-foreground">{meta?.label ?? name}</span>
        <span className="font-mono font-medium text-foreground">
          {formattedValue}
          {meta?.unit ? ` ${meta.unit}` : ""}
        </span>
      </div>
    );
  };

  return (
    <Card className={cn("border-2", className)}>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {data.length ? `Last ${data.length} updates` : "Awaiting data"}
          </span>
        </div>

        {data.length ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[260px] w-full"
          >
            <LineChart
              data={data}
              margin={{ left: 12, right: 12, top: 12, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" strokeOpacity={0.2} />
              <XAxis
                dataKey={timeKey}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value: number) =>
                  typeof value === "number"
                    ? (yTickFormatter ?? defaultTickFormatter)(value)
                    : value
                }
              />
              <ChartTooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<ChartTooltipContent formatter={tooltipFormatter} />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {series.map((item) => (
                <Line
                  key={item.dataKey}
                  type="monotone"
                  dataKey={item.dataKey}
                  stroke={`var(--color-${item.dataKey})`}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </Card>
  );
}
