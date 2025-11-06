import { WebSocketSandboxClient, createWebSocketDemo } from "@/dummy/websocketSandbox";

interface TestStep {
  description: string;
  expected: string;
  notes?: string;
}

interface TestCase {
  id: string;
  title: string;
  objective: string;
  setup: TestStep[];
  execution: TestStep[];
  assertions: TestStep[];
  cleanup?: TestStep[];
  diagnostics?: string[];
}

export const websocketSandboxTestPlan: TestCase[] = [
  {
    id: "WS-001",
    title: "Client transitions through connection lifecycle",
    objective: "Confirm sandbox client reports state changes from idle -> connecting -> open -> closed.",
    setup: [
      {
        description: "Instantiate WebSocketSandboxClient targeting 'demo-channel'.",
        expected: "connectionState === 'idle'.",
      },
    ],
    execution: [
      {
        description: "Call connect() and await resolution.",
        expected: "State flips to 'connecting' immediately, then 'open'.",
      },
    ],
    assertions: [
      {
        description: "After connect resolves, inspect connectionState.",
        expected: "State equals 'open'.",
      },
      {
        description: "Invoke disconnect() and read state again.",
        expected: "State equals 'closed'.",
      },
    ],
    cleanup: [
      {
        description: "No persistent resources, ensure disconnect invoked.",
        expected: "Listeners cleared; no residual console output.",
      },
    ],
    diagnostics: ["Capture timestamps before/after connect() to verify async delay ~150ms."],
  },
  {
    id: "WS-002",
    title: "Messages broadcast to all subscribed listeners",
    objective: "Validate broker distributes payloads to multiple clients subscribed to same channel.",
    setup: [
      {
        description: "Create two WebSocketSandboxClient instances against shared channel.",
        expected: "Both start at 'idle'.",
      },
      {
        description: "Register message listeners recording received envelopes.",
        expected: "Each listener pushes to dedicated array.",
      },
    ],
    execution: [
      {
        description: "Connect both clients, then send 'ping' from client A.",
        expected: "Broadcast occurs asynchronously to both listeners.",
      },
      {
        description: "Send 'pong' from client B.",
        expected: "Both arrays include second envelope preserving sender IDs.",
      },
    ],
    assertions: [
      {
        description: "Check message order in recording arrays.",
        expected: "Entries maintain chronological order and include original payloads.",
      },
      {
        description: "Confirm backlog replay by connecting third late client.",
        expected: "Recent history (<=20) delivered instantly after connect.",
      },
    ],
    cleanup: [
      {
        description: "Disconnect all clients to release listeners.",
        expected: "No more broker dispatch after teardown.",
      },
    ],
    diagnostics: ["Record envelope.sender to ensure unique client IDs."],
  },
  {
    id: "WS-003",
    title: "Disconnect triggers teardown and closure notification",
    objective: "Ensure disconnect removes channel subscriptions and emits sentinel payload.",
    setup: [
      {
        description: "Connect client via createWebSocketDemo() helper.",
        expected: "Console logs may appear; intercept if necessary.",
      },
    ],
    execution: [
      {
        description: "Call disconnect().",
        expected: "Client emits synthetic '__CLOSE__' envelope to listeners.",
      },
    ],
    assertions: [
      {
        description: "Verify lingering send() throws once client closed.",
        expected: "Error: 'WebSocketSandboxClient must be connected before sending.'",
      },
      {
        description: "Confirm connectionTeardown() executed and listener count zero.",
        expected: "Subsequent broker pushes do not reach disconnected listener.",
      },
    ],
  },
];

export const websocketDemoHarness = createWebSocketDemo;

export default websocketSandboxTestPlan;
