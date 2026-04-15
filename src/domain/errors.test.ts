import { describe, expect, it } from "bun:test";
import {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "./errors.ts";

describe("SclangSpawnError", () => {
  it("has _tag SclangSpawnError and message", () => {
    const err = new SclangSpawnError({ message: "sclang not found" });
    expect(err._tag).toBe("SclangSpawnError");
    expect(err.message).toBe("sclang not found");
  });

  it("accepts an optional cause", () => {
    const cause = new Error("ENOENT");
    const err = new SclangSpawnError({ message: "spawn failed", cause });
    expect(err.cause).toBe(cause);
  });
});

describe("SclangEvalError", () => {
  it("has _tag SclangEvalError with code and message fields", () => {
    const err = new SclangEvalError({ code: "1 + 1", message: "syntax error" });
    expect(err._tag).toBe("SclangEvalError");
    expect(err.code).toBe("1 + 1");
    expect(err.message).toBe("syntax error");
  });
});

describe("SclangTimeoutError", () => {
  it("has _tag SclangTimeoutError with code and timeoutMs fields", () => {
    const err = new SclangTimeoutError({ code: "inf.wait", timeoutMs: 5000 });
    expect(err._tag).toBe("SclangTimeoutError");
    expect(err.code).toBe("inf.wait");
    expect(err.timeoutMs).toBe(5000);
  });
});

describe("ServerNotRunningError", () => {
  it("has _tag ServerNotRunningError", () => {
    const err = new ServerNotRunningError({ message: "SC server not booted" });
    expect(err._tag).toBe("ServerNotRunningError");
    expect(err.message).toBe("SC server not booted");
  });
});
