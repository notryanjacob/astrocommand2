interface MqttMessage {
  topic: string;
  payload: string;
  retained: boolean;
  timestamp: number;
}

type TopicListener = (message: MqttMessage) => void;

class LocalMqttBroker {
  private static topics = new Map<string, { retained?: MqttMessage; listeners: Set<TopicListener> }>();

  static publish(message: MqttMessage) {
    const entry = this.ensureTopic(message.topic);
    if (message.retained) {
      entry.retained = message;
    }
    entry.listeners.forEach((listener) => listener(message));
  }

  static subscribe(topic: string, listener: TopicListener, replayRetained: boolean) {
    const entry = this.ensureTopic(topic);
    entry.listeners.add(listener);

    if (replayRetained && entry.retained) {
      setTimeout(() => listener(entry.retained!), 0);
    }

    return () => entry.listeners.delete(listener);
  }

  private static ensureTopic(topic: string) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, { listeners: new Set() });
    }

    return this.topics.get(topic)!;
  }
}

export class MqttSandboxClient {
  private connected = false;
  private readonly subscriptions = new Map<string, () => void>();

  constructor(private readonly clientId = `mqtt-${Math.random().toString(16).slice(2, 10)}`) {}

  async connect() {
    if (this.connected) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.connected = true;
  }

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  publish(topic: string, payload: string, { retain = false }: { retain?: boolean } = {}) {
    if (!this.connected) {
      throw new Error("MQTT client must be connected before publishing.");
    }

    LocalMqttBroker.publish({
      topic,
      payload: `${payload} (via ${this.clientId})`,
      retained: retain,
      timestamp: Date.now(),
    });
  }

  subscribe(topic: string, listener: TopicListener, { replayRetained = true }: { replayRetained?: boolean } = {}) {
    if (!this.connected) {
      throw new Error("MQTT client must be connected before subscribing.");
    }

    const unsubscribe = LocalMqttBroker.subscribe(topic, listener, replayRetained);
    this.subscriptions.set(topic, unsubscribe);
    return () => {
      unsubscribe();
      this.subscriptions.delete(topic);
    };
  }
}

export const createMqttDemo = () => {
  const publisher = new MqttSandboxClient("publisher");
  const subscriber = new MqttSandboxClient("subscriber");

  return Promise.all([publisher.connect(), subscriber.connect()]).then(() => {
    subscriber.subscribe("station/alerts", (message) => {
      console.log(`[MQTT] ${message.topic} -> ${message.payload}`);
    });

    publisher.publish("station/alerts", "Life support nominal", { retain: true });
    publisher.publish("station/alerts", "Power grid stable");

    return { publisher, subscriber };
  });
};
