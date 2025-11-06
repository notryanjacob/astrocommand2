import { MqttSandboxClient, createMqttDemo } from "@/dummy/mqttSandbox";

interface TestStep {
  description: string;
  expected: string;
  rationale?: string;
}

interface TestCase {
  id: string;
  title: string;
  objective: string;
  preconditions: string[];
  steps: TestStep[];
  assertions: TestStep[];
  followUp?: string[];
}

export const mqttSandboxTestPlan: TestCase[] = [
  {
    id: "MQ-001",
    title: "Client connect/disconnect lifecycle",
    objective: "Ensure clients transition between connected states and releases subscriptions on disconnect.",
    preconditions: ["Create new MqttSandboxClient with custom clientId."],
    steps: [
      {
        description: "Call connect() and await completion.",
        expected: "Client internal flag connected === true.",
        rationale: "Verifies async handshake simulation functions.",
      },
      {
        description: "After connect, call disconnect().",
        expected: "connected flag reverts to false and subscriptions cleared.",
      },
    ],
    assertions: [
      {
        description: "Attempt to publish after disconnect.",
        expected: "Throws Error('MQTT client must be connected before publishing.').",
      },
      {
        description: "Attempt to subscribe after disconnect.",
        expected: "Throws Error('MQTT client must be connected before subscribing.').",
      },
    ],
    followUp: ["Reconnect to confirm client can be reused after disconnect."],
  },
  {
    id: "MQ-002",
    title: "Publish/Subscribe message routing and retained payloads",
    objective: "Validate broker delivers retained messages to late subscribers and appends publisher identity.",
    preconditions: [
      "Connect publisher and subscriber clients.",
      "Prepare arrays to log received messages (topic, payload, retained).",
    ],
    steps: [
      {
        description: "Subscriber subscribes to 'station/alerts' with replayRetained = true.",
        expected: "Returns unsubscribe function stored for later use.",
      },
      {
        description: "Publisher publishes retained message 'Life support nominal'.",
        expected: "Subscriber receives payload ending with '(via publisher)'.",
        rationale: "Confirms broker appends publisher clientId.",
      },
      {
        description: "Subscriber unsubscribes and resubscribes.",
        expected: "Immediately receives retained message from step 2.",
      },
      {
        description: "Publisher publishes non-retained message 'Power grid stable'.",
        expected: "Subscriber receives payload once; disconnect/reconnect does not replay it.",
      },
    ],
    assertions: [
      {
        description: "Verify retained message timestamps increase sequentially.",
        expected: "Later publish timestamp > retained baseline.",
      },
      {
        description: "Confirm subscriber log contains exactly two messages.",
        expected: "First retained flagged true, second flagged false.",
      },
    ],
  },
  {
    id: "MQ-003",
    title: "createMqttDemo convenience harness",
    objective: "Document expectations of bundled demo helper returning publisher/subscriber pair.",
    preconditions: ["Invoke createMqttDemo()."],
    steps: [
      {
        description: "Await Promise resolution.",
        expected: "Returns object containing { publisher, subscriber } both connected.",
      },
    ],
    assertions: [
      {
        description: "Confirm subscriber already subscribed to 'station/alerts'.",
        expected: "Manual publish triggers console log without additional setup.",
      },
      {
        description: "Check that first logged message represents retained payload.",
        expected: "Console output should show '(via publisher)' suffix.",
      },
    ],
    followUp: ["Call subscriber.disconnect() then publisher.disconnect() to avoid lingering subscriptions."],
  },
];

export const mqttDemoHarness = createMqttDemo;

export default mqttSandboxTestPlan;
