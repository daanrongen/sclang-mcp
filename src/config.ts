import { Config } from "effect";

export const SclangConfig = {
  path: Config.withDefault(
    Config.string("SCLANG_PATH"),
    "/Applications/SuperCollider.app/Contents/MacOS/sclang",
  ),
  conf: Config.option(Config.string("SCLANG_CONF")),
};
