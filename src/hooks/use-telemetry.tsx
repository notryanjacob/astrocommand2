import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface LifeSupportData {
  oxygen: number;
  co2: number;
  humidity: number;
  temperature: number;
  pressure: number;
}

export interface LifeSupportHistoryEntry {
  time: string;
  oxygen: number;
  co2: number;
  humidity: number;
  temperature: number;
  pressure: number;
}

export interface PowerData {
  solarOutput: number;
  batteryLevel: number;
  consumption: number;
  netPower: number;
}

export interface PowerHistoryEntry {
  time: string;
  solarOutput: number;
  batteryLevel: number;
  consumption: number;
  netPower: number;
}

export interface CrewMember {
  id: string;
  name: string;
  heartRate: number;
  stress: number;
  fatigue: number;
}

export interface CrewHistoryEntry {
  time: string;
  metrics: Record<string, { heartRate: number; stress: number; fatigue: number }>;
}

interface TelemetryContextValue {
  lifeSupport: LifeSupportData;
  lifeSupportHistory: LifeSupportHistoryEntry[];
  power: PowerData;
  powerHistory: PowerHistoryEntry[];
  crew: CrewMember[];
  crewHistory: CrewHistoryEntry[];
  optimizePower: () => void;
  boostOxygen: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

const INITIAL_LIFE_SUPPORT: LifeSupportData = {
  oxygen: 21,
  co2: 0.04,
  humidity: 45,
  temperature: 22,
  pressure: 101.3,
};

const INITIAL_POWER: PowerData = {
  solarOutput: 180,
  batteryLevel: 85,
  consumption: 120,
  netPower: 60,
};

const INITIAL_CREW: CrewMember[] = [
  { id: "1", name: "Commander Sarah Chen", heartRate: 72, stress: 30, fatigue: 25 },
  { id: "2", name: "Engineer Marcus Rodriguez", heartRate: 68, stress: 25, fatigue: 35 },
  { id: "3", name: "Scientist Dr. Yuki Tanaka", heartRate: 75, stress: 40, fatigue: 30 },
];

export const TelemetryProvider = ({ children }: { children: ReactNode }) => {
  const [lifeSupport, setLifeSupport] = useState<LifeSupportData>(INITIAL_LIFE_SUPPORT);
  const [lifeSupportHistory, setLifeSupportHistory] = useState<LifeSupportHistoryEntry[]>([]);

  const [power, setPower] = useState<PowerData>(INITIAL_POWER);
  const [powerHistory, setPowerHistory] = useState<PowerHistoryEntry[]>([]);

  const [crew, setCrew] = useState<CrewMember[]>(INITIAL_CREW);
  const [crewHistory, setCrewHistory] = useState<CrewHistoryEntry[]>([]);

  const powerBoostRef = useRef<{
    solar: number;
    consumptionReduction: number;
    batteryGain: number;
    expires: number;
  } | null>(null);
  const oxygenBoostRef = useRef<{
    amount: number;
    co2Reduction: number;
    expires: number;
  } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLifeSupport((prev) => {
        let oxygen = Math.max(19, Math.min(23, prev.oxygen + (Math.random() - 0.5) * 0.2));
        let co2 = Math.max(0.03, Math.min(0.1, prev.co2 + (Math.random() - 0.5) * 0.01));
        const humidity = Math.max(40, Math.min(60, prev.humidity + (Math.random() - 0.5) * 2));
        const temperature = Math.max(20, Math.min(24, prev.temperature + (Math.random() - 0.5) * 0.5));
        const pressure = Math.max(100, Math.min(102, prev.pressure + (Math.random() - 0.5) * 0.3));

        const boost = oxygenBoostRef.current;
        if (boost) {
          if (boost.expires <= Date.now()) {
            oxygenBoostRef.current = null;
          } else {
            oxygen = Math.min(24, oxygen + boost.amount);
            co2 = Math.max(0.02, co2 - boost.co2Reduction);
          }
        }

        return {
          oxygen,
          co2,
          humidity,
          temperature,
          pressure,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPower((prev) => {
        let solarOutput = Math.max(0, Math.min(240, prev.solarOutput + (Math.random() - 0.5) * 30));
        let consumption = Math.max(80, Math.min(150, prev.consumption + (Math.random() - 0.5) * 10));

        const boost = powerBoostRef.current;
        if (boost) {
          if (boost.expires <= Date.now()) {
            powerBoostRef.current = null;
          } else {
            solarOutput = Math.min(260, solarOutput + boost.solar);
            consumption = Math.max(60, consumption - boost.consumptionReduction);
          }
        }

        let netPower = solarOutput - consumption;
        let batteryLevel = prev.batteryLevel + (netPower > 0 ? 0.5 : -0.3);

        if (boost && boost.expires > Date.now()) {
          batteryLevel += boost.batteryGain;
        }

        batteryLevel = Math.max(0, Math.min(100, batteryLevel));

        return {
          solarOutput,
          consumption,
          netPower,
          batteryLevel,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCrew((prev) =>
        prev.map((member) => ({
          ...member,
          heartRate: Math.max(60, Math.min(100, member.heartRate + (Math.random() - 0.5) * 4)),
          stress: Math.max(0, Math.min(100, member.stress + (Math.random() - 0.5) * 5)),
          fatigue: Math.max(0, Math.min(100, member.fatigue + (Math.random() - 0.5) * 3)),
        })),
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setLifeSupportHistory((prev) => [
      ...prev.slice(-29),
      {
        time: timestamp,
        oxygen: Number(lifeSupport.oxygen.toFixed(2)),
        co2: Number((lifeSupport.co2 * 100).toFixed(2)),
        humidity: Number(lifeSupport.humidity.toFixed(1)),
        temperature: Number(lifeSupport.temperature.toFixed(2)),
        pressure: Number(lifeSupport.pressure.toFixed(2)),
      },
    ]);
  }, [lifeSupport]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setPowerHistory((prev) => [
      ...prev.slice(-29),
      {
        time: timestamp,
        solarOutput: Number(power.solarOutput.toFixed(0)),
        batteryLevel: Number(power.batteryLevel.toFixed(1)),
        consumption: Number(power.consumption.toFixed(0)),
        netPower: Number(power.netPower.toFixed(1)),
      },
    ]);
  }, [power]);

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const snapshot = crew.reduce<CrewHistoryEntry["metrics"]>((acc, member) => {
      acc[member.id] = {
        heartRate: Number(member.heartRate.toFixed(0)),
        stress: Number(member.stress.toFixed(0)),
        fatigue: Number(member.fatigue.toFixed(0)),
      };
      return acc;
    }, {});

    setCrewHistory((prev) => [...prev.slice(-19), { time: timestamp, metrics: snapshot }]);
  }, [crew]);

  const optimizePower = useCallback(() => {
    const boost = {
      solar: 35,
      consumptionReduction: 12,
      batteryGain: 1.5,
      expires: Date.now() + 20000,
    };
    powerBoostRef.current = boost;

    setPower((prev) => {
      const solarOutput = Math.min(260, prev.solarOutput + boost.solar);
      const consumption = Math.max(60, prev.consumption - boost.consumptionReduction);
      const netPower = solarOutput - consumption;
      const batteryLevel = Math.max(
        0,
        Math.min(100, prev.batteryLevel + (netPower > 0 ? 2 : 0.5) + boost.batteryGain),
      );

      return {
        solarOutput,
        consumption,
        netPower,
        batteryLevel,
      };
    });
  }, []);

  const boostOxygen = useCallback(() => {
    const boost = {
      amount: 1.2,
      co2Reduction: 0.01,
      expires: Date.now() + 18000,
    };
    oxygenBoostRef.current = boost;

    setLifeSupport((prev) => ({
      oxygen: Math.min(24, prev.oxygen + boost.amount),
      co2: Math.max(0.02, prev.co2 - boost.co2Reduction),
      humidity: prev.humidity,
      temperature: prev.temperature,
      pressure: prev.pressure,
    }));
  }, []);

  const value = useMemo(
    () => ({
      lifeSupport,
      lifeSupportHistory,
      power,
      powerHistory,
      crew,
      crewHistory,
      optimizePower,
      boostOxygen,
    }),
    [
      lifeSupport,
      lifeSupportHistory,
      power,
      powerHistory,
      crew,
      crewHistory,
      optimizePower,
      boostOxygen,
    ],
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }

  return context;
};
