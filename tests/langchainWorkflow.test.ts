import { createDemoLangChain, LangChainWorkflow, WorkflowResult } from "@/dummy/langchainWorkflow";

type Phase = "arrange" | "act" | "assert";

interface TestStep {
  phase: Phase;
  description: string;
  expected?: string;
  notes?: string;
}

interface TestCase {
  id: string;
  title: string;
  objective: string;
  steps: TestStep[];
  sampleExecution?: () => Promise<WorkflowResult> | WorkflowResult;
  cleanup?: () => void;
  risks?: string[];
}

const runSample = async (query: string) => {
  const workflow = new LangChainWorkflow(4)
    .registerTool("echo", "repeats the input", (input) => `echo:${input.slice(-30)}`)
    .addStep(
      "Echo latest message",
      ["Memory recap: {{memory}}", "Last user request: {{input}}", "Respond with tool output only."].join("\n"),
      "echo",
    )
    .addStep(
      "Compose closing",
      ["Tool results: {{toolResults}}", "Deliver a one sentence reply for the user."].join("\n"),
    );

  return workflow.invoke(query, { origin: "unit-test" });
};

export const langchainWorkflowTestPlan: TestCase[] = [
  {
    id: "LC-001",
    title: "Workflow executes registered steps in order",
    objective:
      "Ensure a workflow containing multiple steps processes them sequentially and persists assistant responses in memory.",
    steps: [
      {
        phase: "arrange",
        description: "Create a new workflow with two steps and memory window of four.",
        expected: "Workflow ready with empty history.",
      },
      {
        phase: "act",
        description: "Invoke the workflow with query 'Summarize station status'.",
        expected:
          "Each step receives formatted prompt containing memory summary and returns deterministic responses.",
      },
      {
        phase: "assert",
        description: "Validate final response matches synthesized output and memory contains alternating user/assistant entries.",
        expected: "WorkflowResult.final is non-empty; trace length equals number of steps; memory size <= window.",
      },
    ],
    sampleExecution: () => {
      const demo = createDemoLangChain();
      return demo.invoke("Summarize station status", { source: "unit-test" });
    },
    risks: [
      "If tool registration fails silently, downstream steps may lack required context.",
      "Memory window sizing errors could cause uncontrolled growth or unhelpful truncation.",
    ],
  },
  {
    id: "LC-002",
    title: "Tool invocation populates trace entries",
    objective: "Verify workflow captures tool outputs and surfaces them through the trace for diagnostics.",
    steps: [
      {
        phase: "arrange",
        description: "Register a mock tool returning static payload 'Simulated forecast'.",
        expected: "Tool registry contains the mock with accessible description.",
      },
      {
        phase: "act",
        description: "Invoke workflow and confirm tool executes when referenced by step definition.",
        expected: "Tool result stored in ChainContext.toolResults and passed to downstream step.",
      },
      {
        phase: "assert",
        description: "Inspect WorkflowResult.trace to ensure step entry includes toolResult field.",
        expected: "toolResult string contains tool name and description; no undefined entries.",
      },
    ],
    sampleExecution: () => runSample("Request weather: location:orbital platform"),
    risks: [
      "If tool throws, ensure try/catch propagates informative error rather than silent failure.",
      "Large tool outputs may bloat trace and affect memory summarization.",
    ],
  },
  {
    id: "LC-003",
    title: "Empty workflow yields guard-rail error",
    objective: "Validate workflows without steps fail fast with descriptive error message.",
    steps: [
      {
        phase: "arrange",
        description: "Instantiate LangChainWorkflow without registering steps.",
        expected: "Workflow contains zero steps.",
      },
      {
        phase: "act",
        description: "Call invoke with arbitrary query.",
        expected: "Method throws Error('No steps registered in the LangChain workflow.').",
      },
      {
        phase: "assert",
        description: "Catch error and confirm message matches documented contract.",
        expected: "Error message stable for downstream consumers performing negative tests.",
      },
    ],
    sampleExecution: () => {
      const workflow = new LangChainWorkflow();
      return workflow.invoke("noop");
    },
    risks: ["Changing error message may break tests depending on exact string comparison."],
  },
  {
    id: "LC-004",
    title: "Memory window trims oldest entries",
    objective:
      "Ensure memory stores only the configured number of recent exchanges while preserving chronology of retained entries.",
    steps: [
      {
        phase: "arrange",
        description: "Initialize workflow with memory window of two and feed sequential user prompts.",
        expected: "Memory starts empty and grows up to two entries per role.",
      },
      {
        phase: "act",
        description: "Invoke workflow three times with distinct inputs.",
        expected: "After third invocation, the first exchange is no longer available in memory snapshot.",
      },
      {
        phase: "assert",
        description: "Inspect ConversationMemory.snapshot() length and ensure timestamps increase.",
        expected: "Snapshot length equals window*2 or less; entries sorted ascending by timestamp.",
      },
    ],
    sampleExecution: async () => {
      const workflow = createDemoLangChain();
      await workflow.invoke("First message");
      await workflow.invoke("Second message");
      return workflow.invoke("Third message");
    },
  },
];

export default langchainWorkflowTestPlan;
