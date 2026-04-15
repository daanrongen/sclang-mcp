import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { SclangClientTest } from "../infra/SclangClientTest.ts";
import { SclangClient } from "./SclangClient.ts";

describe("eval", () => {
  it("eval returns EvalResult with correct code", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.eval("1 + 1");
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.code).toBe("1 + 1");
    expect(result.result).toBe("nil");
  });

  it("eval returns default nil result", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.eval("SinOsc.ar(440)");
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.result).toBe("nil");
    expect(result.stdout).toEqual([]);
  });

  it("eval multiple times does not error", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.eval("1 + 1");
        yield* client.eval("2 + 2");
        yield* client.eval("3 + 3");
      }).pipe(Effect.provide(SclangClientTest)),
    );
  });

  it("loadFile returns LoadResult with correct path", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.loadFile("/path/to/file.scd");
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.path).toBe("/path/to/file.scd");
    expect(result.result).toBe("nil");
  });
});

describe("server", () => {
  it("serverStatus fails with ServerNotRunningError before boot", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.serverStatus();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(exit._tag).toBe("Failure");
  });

  it("freeAll fails before boot", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.freeAll();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(exit._tag).toBe("Failure");
  });

  it("listSynthDefs fails before boot", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.listSynthDefs();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(exit._tag).toBe("Failure");
  });

  it("nodeTree fails before boot", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.nodeTree();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(exit._tag).toBe("Failure");
  });

  it("boot returns running ServerStatus", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        return yield* client.boot();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.running).toBe(true);
    expect(result.numGroups).toBe(1);
    expect(result.sampleRate).toBe(44100);
  });

  it("serverStatus succeeds after boot", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        return yield* client.serverStatus();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.running).toBe(true);
  });

  it("freeAll succeeds after boot", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        yield* client.freeAll();
      }).pipe(Effect.provide(SclangClientTest)),
    );
  });

  it("listSynthDefs returns default synthdef after boot", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        return yield* client.listSynthDefs();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("default");
  });

  it("nodeTree returns root group after boot", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* SclangClient;
        yield* client.boot();
        return yield* client.nodeTree();
      }).pipe(Effect.provide(SclangClientTest)),
    );
    expect(result.id).toBe(0);
    expect(result.type).toBe("group");
  });
});
