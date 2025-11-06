import { useCallback, useMemo, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/hooks/use-telemetry";
import { useToast } from "@/hooks/use-toast";

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

type GeminiContent = {
  role: string;
  parts: Array<{ text: string }>;
};

// Kept here for reference, but LangChain will handle the call now.
// If you want to keep direct REST fallbacks later, you can.
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`;

const formatTrend = (current: number, previous?: number, unit = "", precision = 2) => {
  if (previous === undefined) {
    return "holding steady";
  }
  const delta = current - previous;
  if (Math.abs(delta) < 0.01) {
    return "holding steady";
  }
  const direction = delta > 0 ? "rising" : "falling";
  return `${direction} by ${Math.abs(delta).toFixed(precision)}${unit}`;
};

const buildTelemetrySnapshot = (
  telemetry: ReturnType<typeof useTelemetry>,
): { summary: string; highlights: string } => {
  const {
    lifeSupport,
    lifeSupportHistory,
    power,
    powerHistory,
    crew,
    crewHistory,
  } = telemetry;

  const lastLife = lifeSupportHistory[lifeSupportHistory.length - 1];
  const prevLife = lifeSupportHistory[lifeSupportHistory.length - 2];
  const co2Percent = lifeSupport.co2 * 100;

  const lastPower = powerHistory[powerHistory.length - 1];
  const prevPower = powerHistory[powerHistory.length - 2];

  const lastCrew = crewHistory[crewHistory.length - 1];
  const prevCrew = crewHistory[crewHistory.length - 2];

  const avgHeart = crew.length
    ? crew.reduce((total, member) => total + member.heartRate, 0) / crew.length
    : 0;
  const avgStress = crew.length
    ? crew.reduce((total, member) => total + member.stress, 0) / crew.length
    : 0;
  const avgFatigue = crew.length
    ? crew.reduce((total, member) => total + member.fatigue, 0) / crew.length
    : 0;

  const summaryLines = [
    `Life Support: O₂ ${lifeSupport.oxygen.toFixed(1)}% (${formatTrend(
      lifeSupport.oxygen,
      prevLife?.oxygen,
      "%",
      2,
    )}), CO₂ ${co2Percent.toFixed(2)}%, humidity ${lifeSupport.humidity.toFixed(
      0,
    )}%, temperature ${lifeSupport.temperature.toFixed(
      1,
    )}°C, hull pressure ${lifeSupport.pressure.toFixed(1)} kPa.`,
    `Power: Solar ${power.solarOutput.toFixed(
      0,
    )} kW (${formatTrend(power.solarOutput, prevPower?.solarOutput, " kW")}), consumption ${power.consumption.toFixed(
      0,
    )} kW, net ${power.netPower.toFixed(1)} kW, battery ${power.batteryLevel.toFixed(0)}%.`,
    `Crew: Avg heart ${avgHeart.toFixed(0)} bpm, stress ${avgStress.toFixed(0)}%, fatigue ${avgFatigue.toFixed(0)}%.`,
  ];

  const crewHighlights = crew
    .map((member) => {
      const lastMetrics = lastCrew?.metrics[member.id];
      const prevMetrics = prevCrew?.metrics[member.id];

      const heartTrend =
        lastMetrics && prevMetrics
          ? formatTrend(lastMetrics.heartRate, prevMetrics.heartRate, " bpm", 1)
          : "holding steady";

      return `${member.name}: ${member.heartRate.toFixed(
        0,
      )} bpm (${heartTrend}), stress ${member.stress.toFixed(0)}%, fatigue ${member.fatigue.toFixed(0)}%.`;
    })
    .join("\n");

  return {
    summary: summaryLines.join("\n"),
    highlights: crewHighlights,
  };
};

// 🟢 Build a LangChain chat history from your UI messages
function toLangChainHistory(history: Message[]) {
  // We exclude the *latest* user message from history when we feed it separately to the prompt
  // but sending full history is fine; the prompt template includes a placeholder.
  return history.map((m) =>
    m.sender === "user" ? new HumanMessage(m.text) : new AIMessage(m.text),
  );
}

// 🟢 Simple chain: Prompt → Model → Parser
function makeChain(apiKey: string, telemetrySummary: string, crewHighlights: string) {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are AstroCommand, an operational AI assisting a space station crew.",
        "Respond concisely (under 6 sentences) with actionable insights grounded in current telemetry.",
        "Highlight risks, recommend follow-up actions, and cite numeric readings from the provided snapshot when relevant.",
        "If information is insufficient, request specific data rather than fabricating values.",
        "If a prompt is out of context, ask for relevant data (Life Support, Power, Crew).",
        "",
        "[Telemetry Snapshot]",
        "{telemetrySummary}",
        "",
        "[Crew Highlights]",
        "{crewHighlights}",
      ].join("\n"),
    ],
    // History placeholder lets us pass prior chat turns as proper messages
    ["placeholder", "{history}"],
    ["user", "{input}"],
  ]);

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-flash",
    // Optional: You can set safety settings or generationConfig here if you want
    // safetySettings: [...],
    // maxOutputTokens: 512,
  });

  const parser = new StringOutputParser();

  return prompt.pipe(model).pipe(parser);
}

export const AIChat = () => {
  const telemetry = useTelemetry();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "AstroCommand AI Decision Engine initialized. How can I assist with station operations?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const telemetrySnapshot = useMemo(() => buildTelemetrySnapshot(telemetry), [telemetry]);

  // Kept for potential future direct REST usage, but no longer used by LangChain path.
  const buildConversation = useCallback(
    (history: Message[]): GeminiContent[] => {
      return history.map((message, index) => {
        const baseText = message.text.trim();
        const isMostRecentUser = message.sender === "user" && index === history.length - 1;
        const enrichedText =
          isMostRecentUser && telemetrySnapshot.summary
            ? `${baseText}\n\n[Telemetry Snapshot]\n${telemetrySnapshot.summary}\n\n[Crew Highlights]\n${telemetrySnapshot.highlights}`
            : baseText;

        return {
          role: message.sender === "user" ? "user" : "model",
          parts: [{ text: enrichedText }],
        };
      });
    },
    [telemetrySnapshot],
  );

  // 🟢 Replaced with LangChain
  const generateGeminiResponse = useCallback(
    async (query: string, history: Message[]) => {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
      if (!apiKey) {
        return "Gemini API key missing. Please set VITE_GEMINI_API_KEY in your environment to enable live analysis.";
      }

      try {
        const chain = makeChain(
          apiKey,
          telemetrySnapshot.summary,
          telemetrySnapshot.highlights,
        );

        // Split off the latest user input from history
        const prior = history.slice(0, -1);
        const userInput = history[history.length - 1]?.text ?? query;

        const result = await chain.invoke({
          telemetrySummary: telemetrySnapshot.summary,
          crewHighlights: telemetrySnapshot.highlights,
          history: toLangChainHistory(prior),
          input: userInput,
        });

        return (result || "").toString().trim() || "Received an empty response. Please rephrase your request.";
      } catch (error) {
        console.error("LangChain/Gemini request failed", error);
        toast({
          title: "AI Decision Engine Unavailable",
          description: "Unable to reach Gemini via LangChain. Showing heuristic summary instead.",
          variant: "destructive",
        });
        return [
          "Gemini service is temporarily unreachable.",
          "Telemetry summary:",
          telemetrySnapshot.summary,
          telemetrySnapshot.highlights,
        ].join("\n");
      }
    },
    [telemetrySnapshot, toast],
  );

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput("");
    setIsSending(true);

    const aiText = await generateGeminiResponse(userMessage.text, updatedHistory);

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      sender: "ai",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsSending(false);
  };

  return (
    <Card className="p-4 h-[600px] flex flex-col border-2 border-primary/30 bg-card/50">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Bot className="w-5 h-5 text-primary animate-pulse-glow" />
        <h3 className="font-bold">AI Decision Engine</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${message.sender === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground border border-primary/20 whitespace-pre-wrap"
                }`}
            >
              <p className="text-sm">{message.text}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about station systems..."
          className="flex-1 bg-background/50"
          disabled={isSending}
        />
        <Button onClick={handleSend} size="icon" className="glow-primary" disabled={isSending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
