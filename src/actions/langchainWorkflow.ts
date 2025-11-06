type Role = "user" | "assistant";

interface MemoryEntry {
  role: Role;
  text: string;
  timestamp: number;
}

interface ChainContext {
  memory: ConversationMemory;
  metadata: Record<string, unknown>;
  toolResults: Record<string, string>;
}

interface StepTrace {
  step: string;
  prompt: string;
  toolResult?: string;
  response: string;
}

export interface WorkflowResult {
  final: string;
  trace: StepTrace[];
}

type ToolHandler = (input: string, context: ChainContext) => Promise<string> | string;

class ConversationMemory {
  private history: MemoryEntry[] = [];

  constructor(private readonly limit = 6) {}

  append(role: Role, text: string) {
    this.history.push({ role, text, timestamp: Date.now() });
    if (this.history.length > this.limit) {
      this.history = this.history.slice(this.history.length - this.limit);
    }
  }

  snapshot() {
    return [...this.history];
  }

  summarize() {
    const summary = this.history
      .map((entry) => `[${entry.role}] ${entry.text}`)
      .join("\n");

    return summary || "Conversation just started.";
  }
}

class PromptTemplate {
  constructor(private readonly template: string) {}

  format(variables: Record<string, string>) {
    return Object.entries(variables).reduce((text, [key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      return text.replace(pattern, value);
    }, this.template);
  }
}

class LangChainTool {
  constructor(
    public readonly name: string,
    private readonly description: string,
    private readonly handler: ToolHandler,
  ) {}

  async invoke(input: string, context: ChainContext) {
    const result = await this.handler(input, context);
    return `${this.name} (${this.description}): ${result}`;
  }
}

interface ChainStep {
  name: string;
  prompt: PromptTemplate;
  tool?: LangChainTool;
}

export class LangChainWorkflow {
  private readonly tools = new Map<string, LangChainTool>();
  private readonly steps: ChainStep[] = [];
  private readonly memory: ConversationMemory;

  constructor(memoryWindow = 6) {
    this.memory = new ConversationMemory(memoryWindow);
  }

  registerTool(name: string, description: string, handler: ToolHandler) {
    this.tools.set(name, new LangChainTool(name, description, handler));
    return this;
  }

  addStep(name: string, template: string, toolName?: string) {
    const tool = toolName ? this.tools.get(toolName) : undefined;
    if (toolName && !tool) {
      throw new Error(`Tool "${toolName}" has not been registered.`);
    }

    this.steps.push({
      name,
      prompt: new PromptTemplate(template),
      tool,
    });

    return this;
  }

  async invoke(query: string, metadata: Record<string, unknown> = {}): Promise<WorkflowResult> {
    if (!this.steps.length) {
      throw new Error("No steps registered in the LangChain workflow.");
    }

    const context: ChainContext = {
      memory: this.memory,
      metadata: { ...metadata },
      toolResults: {},
    };

    const trace: StepTrace[] = [];
    this.memory.append("user", query);

    let previousOutput = query;
    for (const step of this.steps) {
      const prompt = step.prompt.format({
        input: previousOutput,
        memory: context.memory.summarize(),
        metadata: JSON.stringify(context.metadata),
        toolResults: JSON.stringify(context.toolResults),
      });

      let toolResult: string | undefined;
      if (step.tool) {
        toolResult = await step.tool.invoke(prompt, context);
        context.toolResults[step.tool.name] = toolResult;
      }

      const response = this.generateResponse(prompt, toolResult);
      trace.push({
        step: step.name,
        prompt,
        toolResult,
        response,
      });

      previousOutput = response;
      this.memory.append("assistant", response);
    }

    return {
      final: previousOutput,
      trace,
    };
  }

  private generateResponse(prompt: string, toolObservation?: string) {
    const lines = [prompt.split("\n").slice(-1)[0] ?? prompt];
    if (toolObservation) {
      lines.push(toolObservation);
    }

    const synthesized = lines
      .join(" | ")
      .replace(/\s+/g, " ")
      .trim();

    return synthesized || "No actionable insight produced.";
  }
}

export const createDemoLangChain = () => {
  const workflow = new LangChainWorkflow(8)
    .registerTool("weather", "Fetches weather data", (input) => {
      const location = /location:([a-z\s]+)/i.exec(input)?.[1]?.trim() ?? "the station";
      return `Simulated forecast for ${location}: clear skies, light tailwind.`;
    })
    .registerTool("memory", "Surfaces the most recent memory entry", (_input, context) => {
      const snapshot = context.memory.snapshot().slice(-1)[0];
      if (!snapshot) {
        return "Memory empty.";
      }
      return `${snapshot.role} said "${snapshot.text}"`;
    })
    .addStep(
      "Assess request",
      [
        "User query: {{input}}",
        "Recent memory: {{memory}}",
        "Known tool results: {{toolResults}}",
        "Metadata: {{metadata}}",
        "Summarize intent in one sentence.",
      ].join("\n"),
      "memory",
    )
    .addStep(
      "Run weather check",
      [
        "Intent summary: {{input}}",
        "If the user references weather, call the weather tool with the extracted location.",
        "Otherwise, acknowledge the current intent plainly.",
      ].join("\n"),
      "weather",
    )
    .addStep(
      "Compose response",
      [
        "Weather insights: {{toolResults}}",
        "Final instruction: Provide a concise operational recommendation.",
      ].join("\n"),
    );

  return workflow;
};
