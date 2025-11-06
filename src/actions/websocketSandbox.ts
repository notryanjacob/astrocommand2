type ConnectionState = "idle" | "connecting" | "open" | "closed";

interface Envelope {
  channel: string;
  payload: string;
  timestamp: number;
  sender: string;
}

type MessageListener = (envelope: Envelope) => void;

class InMemoryWebSocketBroker {
  private static channels = new Map<string, { history: Envelope[]; listeners: Set<MessageListener> }>();

  static attach(channel: string, listener: MessageListener) {
    const registry = this.ensureChannel(channel);
    registry.listeners.add(listener);

    return () => {
      registry.listeners.delete(listener);
    };
  }

  static push(envelope: Envelope) {
    const registry = this.ensureChannel(envelope.channel);
    registry.history.push(envelope);
    if (registry.history.length > 20) {
      registry.history.shift();
    }

    registry.listeners.forEach((listener) => {
      // Mimic asynchronous network delivery.
      setTimeout(() => listener(envelope), Math.random() * 120);
    });
  }

  static recent(channel: string) {
    return [...this.ensureChannel(channel).history];
  }

  private static ensureChannel(channel: string) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, { history: [], listeners: new Set() });
    }

    return this.channels.get(channel)!;
  }
}

export class WebSocketSandboxClient {
  private readonly id = `client-${Math.random().toString(36).slice(2, 8)}`;
  private readonly listeners = new Set<MessageListener>();
  private state: ConnectionState = "idle";
  private connectionTeardown?: () => void;

  constructor(private readonly channel: string) {}

  get connectionState() {
    return this.state;
  }

  async connect() {
    if (this.state !== "idle" && this.state !== "closed") {
      return;
    }
    this.state = "connecting";

    await new Promise((resolve) => setTimeout(resolve, 150));
    // if (this.state === "closed") {
    //   return;
    // }

    this.state = "open";
    this.connectionTeardown = InMemoryWebSocketBroker.attach(this.channel, (envelope) => {
      this.listeners.forEach((listener) => listener(envelope));
    });

    // Replay recent events for fast catch-up.
    const backlog = InMemoryWebSocketBroker.recent(this.channel);
    backlog.forEach((envelope) => {
      setTimeout(() => {
        this.listeners.forEach((listener) => listener(envelope));
      }, 0);
    });
  }

  disconnect() {
    if (this.state === "closed") {
      return;
    }

    this.state = "closed";
    if (this.connectionTeardown) {
      this.connectionTeardown();
      this.connectionTeardown = undefined;
    }
    this.listeners.forEach((listener) => listener({ channel: this.channel, payload: "__CLOSE__", timestamp: Date.now(), sender: this.id }));
    this.listeners.clear();
  }

  onMessage(listener: MessageListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(payload: string) {
    if (this.state !== "open") {
      throw new Error("WebSocketSandboxClient must be connected before sending.");
    }

    InMemoryWebSocketBroker.push({
      channel: this.channel,
      payload,
      timestamp: Date.now(),
      sender: this.id,
    });
  }
}

export const createWebSocketDemo = () => {
  const client = new WebSocketSandboxClient("demo-channel");
  client.onMessage((envelope) => {
    if (envelope.payload === "__CLOSE__") {
      return;
    }
    console.log(`[demo-channel] ${envelope.sender}: ${envelope.payload}`);
  });

  return client;
};
