type DocumentData = Record<string, unknown>;

interface DocumentSnapshot {
  id: string;
  data: DocumentData;
  updatedAt: number;
}

type CollectionListener = (documents: DocumentSnapshot[]) => void;
type DocumentListener = (snapshot: DocumentSnapshot | undefined) => void;

interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  databaseURL?: string;
  storageBucket?: string;
}

class CollectionStore {
  private readonly documents = new Map<string, DocumentSnapshot>();
  private readonly collectionListeners = new Set<CollectionListener>();
  private readonly documentListeners = new Map<string, Set<DocumentListener>>();

  writeDocument(id: string, data: DocumentData) {
    const snapshot: DocumentSnapshot = {
      id,
      data: this.mergeDeep(this.documents.get(id)?.data ?? {}, data),
      updatedAt: Date.now(),
    };

    this.documents.set(id, snapshot);
    this.notifyCollection();
    this.notifyDocument(id);

    return snapshot;
  }

  readDocument(id: string) {
    return this.documents.get(id);
  }

  onCollection(listener: CollectionListener) {
    this.collectionListeners.add(listener);
    listener(this.listDocuments());

    return () => this.collectionListeners.delete(listener);
  }

  onDocument(id: string, listener: DocumentListener) {
    if (!this.documentListeners.has(id)) {
      this.documentListeners.set(id, new Set());
    }

    const listeners = this.documentListeners.get(id)!;
    listeners.add(listener);
    listener(this.readDocument(id));

    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        this.documentListeners.delete(id);
      }
    };
  }

  listDocuments() {
    return [...this.documents.values()].sort((a, b) => a.updatedAt - b.updatedAt);
  }

  private notifyCollection() {
    const snapshot = this.listDocuments();
    this.collectionListeners.forEach((listener) => listener(snapshot));
  }

  private notifyDocument(id: string) {
    const snapshot = this.readDocument(id);
    const listeners = this.documentListeners.get(id);
    if (!listeners) return;

    listeners.forEach((listener) => listener(snapshot));
  }

  private mergeDeep(target: DocumentData, source: DocumentData) {
    const result: DocumentData = { ...target };

    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const existing = result[key];
        if (existing && typeof existing === "object" && !Array.isArray(existing)) {
          result[key] = this.mergeDeep(existing as DocumentData, value as DocumentData);
        } else {
          result[key] = this.mergeDeep({}, value as DocumentData);
        }
      } else {
        result[key] = value;
      }
    });

    return result;
  }
}

export class FirebaseSandbox {
  private readonly collections = new Map<string, CollectionStore>();
  private user: { uid: string; email?: string } | null = null;

  constructor(private readonly config: FirebaseConfig) {}

  initializeApp() {
    return {
      appId: `sandbox-${this.config.projectId}`,
      options: this.config,
      createdAt: Date.now(),
    };
  }

  signIn(email: string) {
    this.user = { uid: `user-${Math.random().toString(16).slice(2, 10)}`, email };
    return this.user;
  }

  signOut() {
    this.user = null;
  }

  currentUser() {
    return this.user;
  }

  saveDocument(collection: string, id: string, data: DocumentData) {
    return this.ensureCollection(collection).writeDocument(id, data);
  }

  updateDocument(collection: string, id: string, data: DocumentData) {
    if (!this.ensureCollection(collection).readDocument(id)) {
      throw new Error(`Document "${collection}/${id}" does not exist.`);
    }
    return this.saveDocument(collection, id, data);
  }

  getDocument(collection: string, id: string) {
    return this.ensureCollection(collection).readDocument(id);
  }

  listenToCollection(collection: string, listener: CollectionListener) {
    return this.ensureCollection(collection).onCollection(listener);
  }

  listenToDocument(collection: string, id: string, listener: DocumentListener) {
    return this.ensureCollection(collection).onDocument(id, listener);
  }

  private ensureCollection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new CollectionStore());
    }
    return this.collections.get(name)!;
  }
}

export const createFirebaseDemo = () => {
  const firebase = new FirebaseSandbox({
    apiKey: "demo-key",
    projectId: "demo-project",
  });

  firebase.initializeApp();
  firebase.signIn("crew@station.local");
  firebase.saveDocument("alerts", "life-support", {
    severity: "warning",
    message: "CO₂ trending upward. Increase scrubber output by 5%.",
  });

  firebase.listenToCollection("alerts", (docs) => {
    console.log("[alerts]", docs.map((doc) => doc.data.message));
  });

  return firebase;
};
