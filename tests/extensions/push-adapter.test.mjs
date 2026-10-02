import test from "node:test";
import assert from "node:assert/strict";

import { createPushAdapter } from "../../src/extensions/push-adapter.mjs";

test("push adapter delegates sending to the injected service", async () => {
  const calls = [];
  const adapter = createPushAdapter({
    async sendNotification(subscription, payload) {
      calls.push({ subscription, payload });
      return { ok: true };
    },
  });

  const result = await adapter.send(
    { endpoint: "https://push.example/subscription" },
    { title: "健身" },
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
});

test("push adapter classifies expired, retryable and permanent failures", () => {
  const adapter = createPushAdapter({});

  assert.equal(adapter.classifyError({ statusCode: 410 }), "expired");
  assert.equal(adapter.classifyError({ statusCode: 503 }), "retryable");
  assert.equal(adapter.classifyError({ code: "ECONNRESET" }), "retryable");
  assert.equal(adapter.classifyError({ statusCode: 400 }), "permanent");
});

