import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { test } from "node:test";
import {
  registerShutdownSignals,
  type ShutdownSignalSource,
} from "../src/worker-runtime.ts";

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  test(`${signal} closes worker resources`, async () => {
    const signalSource = new EventEmitter();
    let closeCalls = 0;
    const closed = new EventEmitter();

    registerShutdownSignals(
      {
        async close() {
          closeCalls += 1;
          closed.emit("done");
        },
      },
      signalSource as ShutdownSignalSource,
    );

    const completion = once(closed, "done");
    signalSource.emit(signal);
    await completion;
    assert.equal(closeCalls, 1);
  });
}
