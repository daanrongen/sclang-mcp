import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { SclangClient } from "../../src/domain/SclangClient.ts";
import { SclangClientTest } from "../../src/infra/SclangClientTest.ts";

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
