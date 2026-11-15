import { describe, it, expect, vi, afterEach } from "vitest";
import { getTtsAdapter } from "../../open-sse/handlers/ttsProviders/index.js";
import { splitModelVoice } from "../../open-sse/handlers/ttsProviders/openaiCompatNode.js";
import { handleTtsCore } from "../../open-sse/handlers/ttsCore.js";
import { handleSttCore } from "../../open-sse/handlers/sttCore.js";

const NODE = "openai-compatible-chat-abc123";
const BASE = "https://inference.example.ts.net/v1/";
const creds = (extra = {}) => ({ providerSpecificData: { baseUrl: BASE }, ...extra });

afterEach(() => vi.unstubAllGlobals());

describe("OpenAI-compatible node: TTS", () => {
  it("routes node providers to the node adapter", () => {
    expect(getTtsAdapter(NODE)).toBeTruthy();
    expect(getTtsAdapter(NODE)).not.toBe(getTtsAdapter("openai"));
  });

  it("splits model/voice and passes bare ids through", () => {
    expect(splitModelVoice("qwen3-tts", "Vivian")).toEqual({ model: "qwen3-tts", voice: "Vivian" });
    expect(splitModelVoice("qwen3-tts/Ryan", "Vivian")).toEqual({ model: "qwen3-tts", voice: "Ryan" });
    expect(splitModelVoice("chatterbox-turbo")).toEqual({ model: "chatterbox-turbo", voice: undefined });
  });

  it("posts to {baseUrl}/audio/speech with the model untouched and no auth when keyless", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/wav" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await handleTtsCore({ provider: NODE, model: "qwen3-tts", input: "hi", credentials: creds(), responseFormat: "json", audioFormat: "wav", speed: 1.2 });
    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://inference.example.ts.net/v1/audio/speech");
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ model: "qwen3-tts", input: "hi", response_format: "wav", speed: 1.2 });
    expect(await result.response.json()).toEqual({ audio: "AQID", format: "wav" });
  });

  it("sends the key as a bearer token when the connection has one", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1]), { headers: { "Content-Type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    await handleTtsCore({ provider: NODE, model: "m", input: "hi", credentials: creds({ apiKey: "k1" }) });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer k1");
  });

  it("reports the gateway's FastAPI detail on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "unknown voice" }), { status: 422 })));
    const result = await handleTtsCore({ provider: NODE, model: "m", input: "hi", credentials: creds() });
    expect(result.success).toBeFalsy();
    expect(result.error).toContain("unknown voice");
  });
});

describe("OpenAI-compatible node: STT", () => {
  const form = () => {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array([0, 1])], { type: "audio/wav" }), "a.wav");
    fd.append("model", "cohere-asr");
    fd.append("language", "en");
    return fd;
  };

  it("posts multipart to {baseUrl}/audio/transcriptions without a key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ text: "hello" }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await handleSttCore({ provider: NODE, model: "cohere-asr", formData: form(), credentials: creds() });
    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://inference.example.ts.net/v1/audio/transcriptions");
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body.get("model")).toBe("cohere-asr");
    expect(init.body.get("language")).toBe("en");
    expect(await result.response.json()).toEqual({ text: "hello" });
  });

  it("refuses a node connection with no base URL", async () => {
    const result = await handleSttCore({ provider: NODE, model: "x", formData: form(), credentials: {} });
    expect(result.success).toBeFalsy();
    expect(result.status).toBe(400);
  });
});
