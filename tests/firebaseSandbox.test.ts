import { FirebaseSandbox, createFirebaseDemo } from "@/dummy/firebaseSandbox";

interface ScenarioStep {
  action: string;
  expected: string;
  evidence?: string;
}

interface TestCase {
  id: string;
  title: string;
  objective: string;
  preconditions: string[];
  steps: ScenarioStep[];
  postconditions?: string[];
  coverage: string[];
  regressionRisk?: string;
}

export const firebaseSandboxTestPlan: TestCase[] = [
  {
    id: "FB-001",
    title: "Authentication lifecycle with state isolation",
    objective:
      "Validate sandbox supports signIn, currentUser tracking, and signOut without persisting state across instances.",
    preconditions: ["Create FirebaseSandbox using demo config (apiKey, projectId).", "Ensure no user signed in initially."],
    steps: [
      {
        action: "Invoke currentUser() on fresh instance.",
        expected: "Returns null.",
      },
      {
        action: "Call signIn('commander@station.local').",
        expected: "Method resolves with uid pattern 'user-*' and email stored.",
        evidence: "Capture uid length and uniqueness across runs.",
      },
      {
        action: "Call currentUser() again.",
        expected: "Returns same user object as returned from signIn.",
      },
      {
        action: "Call signOut().",
        expected: "currentUser() returns null.",
      },
      {
        action: "Instantiate second FirebaseSandbox and inspect currentUser.",
        expected: "Still null, confirming no shared static state.",
      },
    ],
    postconditions: ["All references eligible for GC; no event listeners remain active."],
    coverage: ["Authentication state", "Instance isolation"],
  },
  {
    id: "FB-002",
    title: "CRUD operations and deep merge semantics",
    objective:
      "Ensure saveDocument merges nested objects, updateDocument enforces existence, and getDocument surfaces new snapshot.",
    preconditions: ["Signed-in user optional but can leverage createFirebaseDemo()."],
    steps: [
      {
        action: "Call saveDocument('systems', 'life-support', { oxygen: { current: 21 } }).",
        expected: "Document persisted with timestamp and nested object intact.",
      },
      {
        action: "Invoke saveDocument on same doc with { oxygen: { target: 22 }, alarms: ['scrubber'] }.",
        expected: "Result merges with previous data, retaining 'current' value.",
        evidence: "getDocument returns oxygen.current === 21 and oxygen.target === 22.",
      },
      {
        action: "Call updateDocument('systems', 'non-existent', {}).",
        expected: "Throws Error('Document \"systems/non-existent\" does not exist.').",
      },
      {
        action: "Call updateDocument('systems', 'life-support', { alarms: ['scrubber', 'vent'] }).",
        expected: "Array replaced with new value, timestamps refreshed.",
      },
    ],
    coverage: ["Deep merge algorithm", "Update guards", "Timestamp refresh"],
    regressionRisk: "Changing merge strategy might break clients relying on current behavior.",
  },
  {
    id: "FB-003",
    title: "Realtime listeners emit snapshots on subscribe and mutation",
    objective: "Validate collection and document listeners receive initial snapshot and subsequent updates in chronological order.",
    preconditions: ["Ensure collection empty to observe initial callback with []."],
    steps: [
      {
        action: "listenToCollection('alerts', handler) and capture first callback.",
        expected: "Handler invoked immediately with empty array.",
        evidence: "Record timestamp to ensure synchronous delivery.",
      },
      {
        action: "saveDocument('alerts', 'power', { severity: 'info' }).",
        expected: "Collection listener receives array length 1; document listener triggered if registered.",
      },
      {
        action: "listenToDocument('alerts', 'power', handler) after write.",
        expected: "Document listener first callback includes existing snapshot.",
      },
      {
        action: "updateDocument('alerts', 'power', { severity: 'warning' }).",
        expected: "Both listeners fire with updated snapshot and later timestamp.",
      },
      {
        action: "Dispose listener unsubscribes and perform another update.",
        expected: "Removed listeners no longer receive notifications.",
      },
    ],
    postconditions: ["All unsubscribe handles invoked.", "No pending timers."],
    coverage: ["Collection broadcast", "Document subscription", "Unsubscribe path"],
  },
];

export const firebaseDemoHarness = createFirebaseDemo;

export default firebaseSandboxTestPlan;
