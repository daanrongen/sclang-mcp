import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { SclangClient } from "../domain/SclangClient.ts";
import { SclangClientTest } from "./SclangClientTest.ts";

describe("SclangClientTest layer", () => {
  it("eval returns empty stdout array", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.eval("42");
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.stdout).toEqual([]);
  });

  it("boot followed by serverStatus returns avgCPU 0.5 and peakCPU 1.2", async () => {
    const status = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        return yield* client.serverStatus();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(status.avgCPU).toBe(0.5);
    expect(status.peakCPU).toBe(1.2);
  });

  it("boot followed by nodeTree returns name RootNode and empty children", async () => {
    const node = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        return yield* client.nodeTree();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(node.name).toBe("RootNode");
    expect(node.children).toEqual([]);
  });

  it("loadFile does not require boot", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.loadFile("/some/file.scd");
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(exit._tag).toBe("Success");
  });
});
