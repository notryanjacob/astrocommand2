# Sandbox Test Plans

This directory contains detailed, non-executing test plans for the sandboxed integrations. Each file documents structured scenarios that can be executed manually or ported into an automated harness without impacting the primary application.

- `langchainWorkflow.test.ts` – coverage for LangChain-inspired workflow engine.
- `websocketSandbox.test.ts` – lifecycle and broadcast scenarios for the in-memory WebSocket client/broker pair.
- `firebaseSandbox.test.ts` – authentication, CRUD, and realtime listener behaviors for the Firebase-like store.
- `mqttSandbox.test.ts` – MQTT pub/sub lifecycle, retained message handling, and bundled demo expectations.

These scripts export strongly typed plans and optional harness helpers to accelerate future automation. No existing modules import from `tests/`, so they remain isolated from the production build.
