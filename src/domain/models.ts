import { Schema } from "effect";

export class EvalResult extends Schema.Class<EvalResult>("EvalResult")({
  code: Schema.String,
  result: Schema.String,
  stdout: Schema.Array(Schema.String),
}) {}

export class ServerStatus extends Schema.Class<ServerStatus>("ServerStatus")({
  running: Schema.Boolean,
  numSynths: Schema.Number,
  numGroups: Schema.Number,
  numUGens: Schema.Number,
  avgCPU: Schema.Number,
  peakCPU: Schema.Number,
  sampleRate: Schema.Number,
}) {}

export class NodeInfo extends Schema.Class<NodeInfo>("NodeInfo")({
  id: Schema.Number,
  type: Schema.Literal("synth", "group"),
  name: Schema.optional(Schema.String),
  children: Schema.optional(Schema.Array(Schema.Unknown)),
}) {}

export class SynthDefInfo extends Schema.Class<SynthDefInfo>("SynthDefInfo")({
  name: Schema.String,
}) {}

export class LoadResult extends Schema.Class<LoadResult>("LoadResult")({
  path: Schema.String,
  result: Schema.String,
}) {}
