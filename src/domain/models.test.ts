import { describe, expect, it } from "bun:test";
import { EvalResult, LoadResult, NodeInfo, ServerStatus, SynthDefInfo } from "./models.ts";

describe("EvalResult", () => {
  it("constructs with code, result, and stdout", () => {
    const r = new EvalResult({ code: "1 + 1", result: "2", stdout: ["hello"] });
    expect(r.code).toBe("1 + 1");
    expect(r.result).toBe("2");
    expect(r.stdout).toEqual(["hello"]);
  });

  it("constructs with empty stdout", () => {
    const r = new EvalResult({ code: "SinOsc.ar(440)", result: "nil", stdout: [] });
    expect(r.stdout).toEqual([]);
  });
});

describe("ServerStatus", () => {
  it("constructs with all fields", () => {
    const s = new ServerStatus({
      running: true,
      numSynths: 3,
      numGroups: 2,
      numUGens: 12,
      avgCPU: 0.5,
      peakCPU: 1.2,
      sampleRate: 44100,
    });
    expect(s.running).toBe(true);
    expect(s.numSynths).toBe(3);
    expect(s.numGroups).toBe(2);
    expect(s.numUGens).toBe(12);
    expect(s.avgCPU).toBe(0.5);
    expect(s.peakCPU).toBe(1.2);
    expect(s.sampleRate).toBe(44100);
  });

  it("reflects not-running state", () => {
    const s = new ServerStatus({
      running: false,
      numSynths: 0,
      numGroups: 0,
      numUGens: 0,
      avgCPU: 0,
      peakCPU: 0,
      sampleRate: 44100,
    });
    expect(s.running).toBe(false);
    expect(s.sampleRate).toBe(44100);
  });
});

describe("NodeInfo", () => {
  it("constructs as a group with children", () => {
    const child = new NodeInfo({ id: 1, type: "synth", name: "mySynth" });
    const group = new NodeInfo({ id: 0, type: "group", name: "RootNode", children: [child] });
    expect(group.id).toBe(0);
    expect(group.type).toBe("group");
    expect(group.name).toBe("RootNode");
    expect(group.children).toHaveLength(1);
  });

  it("constructs as a synth with name", () => {
    const node = new NodeInfo({ id: 100, type: "synth", name: "default" });
    expect(node.id).toBe(100);
    expect(node.type).toBe("synth");
    expect(node.name).toBe("default");
  });

  it("constructs with optional fields absent", () => {
    const node = new NodeInfo({ id: 42, type: "group" });
    expect(node.id).toBe(42);
    expect(node.name).toBeUndefined();
    expect(node.children).toBeUndefined();
  });
});

describe("SynthDefInfo", () => {
  it("constructs with name", () => {
    const def = new SynthDefInfo({ name: "default" });
    expect(def.name).toBe("default");
  });

  it("stores custom synth def name", () => {
    const def = new SynthDefInfo({ name: "mySuperSynth" });
    expect(def.name).toBe("mySuperSynth");
  });
});

describe("LoadResult", () => {
  it("constructs with path and result", () => {
    const r = new LoadResult({ path: "/path/to/file.scd", result: "nil" });
    expect(r.path).toBe("/path/to/file.scd");
    expect(r.result).toBe("nil");
  });
});
