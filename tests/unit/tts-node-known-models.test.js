import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;

afterEach(() => {
  vi.resetModules();
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("TTS route: node known models", () => {
  it("collects models registered as aliases (dashboard) and as custom models (media pages)", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "krouter-tts-known-"));
    process.env.DATA_DIR = tempDir;
    vi.resetModules();
    const node = `openai-compatible-known-${Date.now()}`;
    const { setModelAlias, addCustomModel } = await import("@/lib/localDb");
    await setModelAlias("qwen-tts", `${node}/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`);
    await setModelAlias("other", "openai-compatible-elsewhere/Qwen/Other");
    await addCustomModel({ providerAlias: node, id: "chatterbox-turbo", type: "tts" });

    const { getNodeKnownModels } = await import("@/sse/handlers/tts.js");
    const known = await getNodeKnownModels(node);
    expect([...known].sort()).toEqual(["Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", "chatterbox-turbo"]);
  });
});
