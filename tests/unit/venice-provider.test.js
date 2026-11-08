import { describe, it, expect, vi, afterEach } from "vitest";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { PROVIDER_MODELS } from "../../open-sse/config/providerModels.js";
import { VENICE_TTS_MODELS, VENICE_VIDEO_MODELS, VENICE_IMAGE_MODELS } from "../../open-sse/config/veniceModels.js";
import { getEmbeddingAdapter } from "../../open-sse/handlers/embeddingProviders/index.js";
import { getTtsAdapter } from "../../open-sse/handlers/ttsProviders/index.js";
import { parseVeniceModelVoice } from "../../open-sse/handlers/ttsProviders/venice.js";
import { getImageAdapter } from "../../open-sse/handlers/imageProviders/index.js";
import { buildVeniceImageBody, nearestAspectRatio, fitDimensions } from "../../open-sse/handlers/imageProviders/venice.js";
import { handleSttCore } from "../../open-sse/handlers/sttCore.js";
import {
  encodeJobId, decodeJobId, buildVideoQueueBody, buildMusicQueueBody, veniceQueue, veniceRetrieve,
} from "../../open-sse/handlers/veniceJobs.js";
import { handleVideoProxyCore, getVideoConfig } from "../../open-sse/handlers/videoCore.js";
import { buildVeniceOperationBody, handleImageOperationCore } from "../../open-sse/handlers/imageOperationsCore.js";
import { buildSearchRequest } from "../../open-sse/handlers/search/callers.js";
import { normalizeSearchResponse } from "../../open-sse/handlers/search/normalizers.js";

const CREDS = { apiKey: "vn-test-key-123456" };

function mockFetch(...responses) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("Venice provider registry", () => {
  const v = AI_PROVIDERS.venice;

  it("declares every service kind it routes", () => {
    for (const kind of ["llm", "embedding", "tts", "stt", "image", "video", "music", "webSearch"]) {
      expect(v.serviceKinds).toContain(kind);
    }
    expect(v.passthroughModels).toBe(true);
  });

  it("points every media config at api.venice.ai/api/v1", () => {
    for (const cfg of [v.embeddingConfig, v.ttsConfig, v.sttConfig, v.searchConfig]) {
      expect(cfg.baseUrl).toMatch(/^https:\/\/api\.venice\.ai\/api\/v1\//);
    }
  });

  it("publishes media models per kind, and no edit-only model as an image generator", () => {
    const types = new Set(PROVIDER_MODELS.venice.map((m) => m.type));
    for (const t of ["embedding", "tts", "stt", "image", "video", "music"]) expect(types.has(t)).toBe(true);
    const imageIds = PROVIDER_MODELS.venice.filter((m) => m.type === "image").map((m) => m.id);
    expect(imageIds.some((id) => id.endsWith("-edit"))).toBe(false);
  });
});

describe("Venice embeddings", () => {
  it("uses the OpenAI-compatible adapter with Venice's URL", () => {
    const a = getEmbeddingAdapter("venice");
    expect(a.buildUrl()).toBe("https://api.venice.ai/api/v1/embeddings");
    expect(a.buildHeaders(CREDS).Authorization).toBe(`Bearer ${CREDS.apiKey}`);
    expect(a.buildBody("text-embedding-bge-m3", { input: "hi", dimensions: 512 })).toEqual({ model: "text-embedding-bge-m3", input: "hi", dimensions: 512 });
  });
});

describe("Venice TTS", () => {
  it("parses model/voice strings and falls back to a real voice for the model", () => {
    expect(parseVeniceModelVoice("tts-kokoro/af_bella")).toEqual({ modelId: "tts-kokoro", voice: "af_bella" });
    expect(parseVeniceModelVoice("tts-kokoro")).toEqual({ modelId: "tts-kokoro", voice: "af_sky" });
    expect(parseVeniceModelVoice("tts-orpheus", "tara")).toEqual({ modelId: "tts-orpheus", voice: "tara" });
    // Inworld publishes no default_voice: the first catalog voice, never "alloy".
    const inworld = VENICE_TTS_MODELS.find((m) => m.id === "tts-inworld-1-5-max");
    expect(parseVeniceModelVoice("tts-inworld-1-5-max").voice).toBe(inworld.voices[0]);
    // A bare non-model string is a Kokoro voice.
    expect(parseVeniceModelVoice("af_nicole")).toEqual({ modelId: "tts-kokoro", voice: "af_nicole" });
  });

  it("sends format/speed only when asked and reads the format from Content-Type", async () => {
    const audio = new Uint8Array(256).fill(7);
    const fetchMock = mockFetch(new Response(audio, { status: 200, headers: { "content-type": "audio/wav" } }));
    const out = await getTtsAdapter("venice").synthesize("hello", "tts-orpheus/tara", CREDS, "mp3", { speed: 9 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.venice.ai/api/v1/audio/speech");
    const body = JSON.parse(init.body);
    expect(body).toEqual({ model: "tts-orpheus", input: "hello", voice: "tara", speed: 4 });
    expect(out.format).toBe("wav");
    expect(Buffer.from(out.base64, "base64").length).toBe(256);
  });
});

describe("Venice STT", () => {
  it("forwards the timestamps field (sttConfig.extraFields) to /audio/transcriptions", async () => {
    const fetchMock = mockFetch(new Response(JSON.stringify({ text: "hi", duration: 1.2 }), { status: 200, headers: { "content-type": "application/json" } }));
    const form = new FormData();
    form.append("file", new File([new Uint8Array(64)], "a.wav", { type: "audio/wav" }));
    form.append("timestamps", "true");
    const res = await handleSttCore({ provider: "venice", model: "openai/whisper-large-v3", formData: form, credentials: CREDS });
    expect(res.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.venice.ai/api/v1/audio/transcriptions");
    expect(init.body.get("model")).toBe("openai/whisper-large-v3");
    expect(init.body.get("timestamps")).toBe("true");
  });
});

describe("Venice image generation", () => {
  it("uses the native endpoint, not the model-substituting OpenAI one", () => {
    expect(getImageAdapter("venice").buildUrl()).toBe("https://api.venice.ai/api/v1/image/generate");
  });

  it("maps n → variants (max 4) and pins the output format", () => {
    const body = buildVeniceImageBody("venice-sd35", { prompt: "cat", n: 9, output_format: "jpg" });
    expect(body.variants).toBe(4);
    expect(body.format).toBe("jpeg");
    expect(body.return_binary).toBe(false);
  });

  it("maps size to aspect_ratio for ratio models and to width/height (≤1280, /16) for the rest", () => {
    const ratioModel = VENICE_IMAGE_MODELS.find((m) => m.aspectRatios?.includes("16:9"));
    const whModel = VENICE_IMAGE_MODELS.find((m) => !m.aspectRatios);
    expect(buildVeniceImageBody(ratioModel.id, { prompt: "x", size: "1792x1024" }).aspect_ratio).toBe("16:9");
    const wh = buildVeniceImageBody(whModel.id, { prompt: "x", size: "1792x1024" });
    expect(wh).toMatchObject({ width: 1280, height: 720 });
    expect(nearestAspectRatio(1024, 1536, ["1:1", "2:3", "16:9"])).toBe("2:3");
    expect(fitDimensions(1024, 1024)).toEqual({ width: 1024, height: 1024 });
  });

  it("normalizes images[] to OpenAI data[], honouring response_format=url", () => {
    const a = getImageAdapter("venice");
    expect(a.normalize({ images: ["AAA", "BBB"] }, "p", {}).data).toEqual([{ b64_json: "AAA" }, { b64_json: "BBB" }]);
    expect(a.normalize({ images: ["AAA"] }, "p", { response_format: "url", output_format: "webp" }).data).toEqual([{ url: "data:image/webp;base64,AAA" }]);
  });
});

describe("Venice async jobs (video / music)", () => {
  it("round-trips job ids and rejects foreign ones", () => {
    const id = encodeJobId("wan-2-7-text-to-video", "q-123");
    expect(id).toBe("venice:wan-2-7-text-to-video:q-123");
    expect(decodeJobId(id)).toEqual({ model: "wan-2-7-text-to-video", queueId: "q-123" });
    expect(decodeJobId("abc123")).toBeNull();
    expect(decodeJobId("venice:nomodel")).toBeNull();
  });

  it("maps xAI-style video bodies to Venice queue bodies", () => {
    const withDur = VENICE_VIDEO_MODELS.find((m) => m.durations?.length);
    expect(buildVideoQueueBody("m", { prompt: "p", duration: 5, image: { url: "https://x/y.png" } }))
      .toEqual({ model: "m", prompt: "p", duration: "5s", image_url: "https://x/y.png" });
    expect(buildVideoQueueBody(withDur.id, { prompt: "p" }).duration).toBe(withDur.durations[0]);
  });

  it("maps music aliases and drops unknown fields (queue is additionalProperties:false)", () => {
    expect(buildMusicQueueBody("elevenlabs-music-v2", { prompt: "lofi", lyrics: "la", duration: 30, instrumental: true, junk: 1 }))
      .toEqual({ model: "elevenlabs-music-v2", prompt: "lofi", lyrics_prompt: "la", duration_seconds: 30, force_instrumental: true });
  });

  it("queue returns an xAI-shaped job with a provider-tagged id", async () => {
    mockFetch(new Response(JSON.stringify({ model: "m1", queue_id: "q9" }), { status: 200, headers: { "content-type": "application/json" } }));
    const res = await veniceQueue({ kind: "video", model: "m1", queueBody: { model: "m1" }, credentials: CREDS });
    expect(await res.response.json()).toMatchObject({ request_id: "venice:m1:q9", status: "pending" });
  });

  it("retrieve: PROCESSING → pending with progress", async () => {
    const fetchMock = mockFetch(new Response(JSON.stringify({ status: "PROCESSING", average_execution_time: 1000, execution_duration: 250 }), { status: 200, headers: { "content-type": "application/json" } }));
    const res = await veniceRetrieve({ kind: "audio", jobId: "venice:ace-step-15:q1", credentials: CREDS });
    expect(await res.response.json()).toMatchObject({ status: "pending", progress: 25 });
    // /audio/retrieve requires the model; it rides in the job id.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ queue_id: "q1", model: "ace-step-15" });
  });

  it("retrieve: binary result → done with an inline data URL", async () => {
    mockFetch(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "video/mp4" } }));
    const res = await veniceRetrieve({ kind: "video", jobId: "venice:m:q", credentials: CREDS });
    const json = await res.response.json();
    expect(json.status).toBe("done");
    expect(json.video).toEqual({ url: "data:video/mp4;base64,AQID", content_type: "video/mp4", size_bytes: 3 });
  });

  it("retrieve: COMPLETED with download_url → done with that url", async () => {
    mockFetch(new Response(JSON.stringify({ status: "COMPLETED", download_url: "https://cdn/v.mp4" }), { status: 200, headers: { "content-type": "application/json" } }));
    const json = await (await veniceRetrieve({ kind: "video", jobId: "venice:m:q", credentials: CREDS })).response.json();
    expect(json).toMatchObject({ status: "done", video: { url: "https://cdn/v.mp4" } });
  });

  it("retrieve: refuses to inline a file over the limit, without a 5xx that locks the account", async () => {
    mockFetch(new Response(new Uint8Array(64), { status: 200, headers: { "content-type": "video/mp4" } }));
    const res = await veniceRetrieve({ kind: "video", jobId: "venice:m:q", credentials: CREDS, maxInlineBytes: 10 });
    expect(res.success).toBe(false);
    expect(res.error).toContain("VENICE_INLINE_MEDIA_MAX_BYTES");
  });

  it("video core dispatches Venice creation and polling through the job adapter", async () => {
    expect(getVideoConfig("venice")).toBeTruthy();
    const fetchMock = mockFetch(new Response(JSON.stringify({ queue_id: "q7" }), { status: 200, headers: { "content-type": "application/json" } }));
    const res = await handleVideoProxyCore({
      provider: "venice", action: "generations", rawBody: JSON.stringify({ model: "wan-2-7-text-to-video", prompt: "a fox", duration: 5 }),
      contentType: "application/json", credentials: CREDS,
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.venice.ai/api/v1/video/queue");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ model: "wan-2-7-text-to-video", duration: "5s" });
    expect((await res.response.json()).request_id).toBe("venice:wan-2-7-text-to-video:q7");
  });

  it("video core rejects multipart bodies for Venice with a clear 400", async () => {
    const res = await handleVideoProxyCore({ provider: "venice", action: "generations", rawBody: Buffer.from("--b\r\n"), contentType: "multipart/form-data; boundary=b", credentials: CREDS });
    expect(res.status).toBe(400);
  });
});

describe("Venice image operations", () => {
  it("edit: requires image + prompt, rejects masks, drops quality", () => {
    expect(() => buildVeniceOperationBody("edit", null, { prompt: "p" })).toThrow(/image/);
    expect(() => buildVeniceOperationBody("edit", null, { prompt: "p", image: "AAA", mask: "BBB" })).toThrow(/mask/);
    expect(buildVeniceOperationBody("edit", "qwen-image-2-edit", { prompt: "p", image: "AAA", quality: "high", aspect_ratio: "1:1" }))
      .toEqual({ image: "AAA", model: "qwen-image-2-edit", prompt: "p", aspect_ratio: "1:1" });
  });

  it("background-remove: http(s) image goes to image_url, base64 to image", () => {
    expect(buildVeniceOperationBody("background-remove", null, { image: "https://x/y.png" })).toEqual({ image_url: "https://x/y.png" });
    expect(buildVeniceOperationBody("background-remove", null, { image: "AAA" })).toEqual({ image: "AAA" });
  });

  it("returns Venice's binary result in OpenAI images shape", async () => {
    const fetchMock = mockFetch(new Response(new Uint8Array([9, 9]), { status: 200, headers: { "content-type": "image/png" } }));
    const res = await handleImageOperationCore({ op: "upscale", provider: "venice", model: null, body: { image: "AAA", scale: 4 }, credentials: CREDS });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.venice.ai/api/v1/image/upscale");
    expect((await res.response.json()).data).toEqual([{ b64_json: "CQk=" }]);
  });
});

describe("Venice web search", () => {
  const config = { id: "venice", ...AI_PROVIDERS.venice.searchConfig };

  it("builds /augment/search and ignores a client baseUrl override (key exfiltration)", () => {
    const { url, init } = buildSearchRequest(config, {
      query: "kRouter", maxResults: 50, token: "k", providerOptions: { baseUrl: "https://evil.example", search_provider: "exa" },
    });
    expect(url).toBe("https://api.venice.ai/api/v1/augment/search");
    expect(JSON.parse(init.body)).toEqual({ query: "kRouter", limit: 20, search_provider: "exa" });
  });

  it("rejects an unknown search backend", () => {
    expect(() => buildSearchRequest(config, { query: "q", maxResults: 5, token: "k", providerOptions: { search_provider: "bing" } })).toThrow();
  });

  it("normalizes results (content → snippet, date → published_at)", () => {
    const out = normalizeSearchResponse("venice", { query: "q", results: [{ title: "T", url: "https://a.b/c", content: "body", date: "2026-11-01" }] }, "q", "web");
    expect(out.results[0]).toMatchObject({ title: "T", url: "https://a.b/c", snippet: "body", published_at: "2026-11-01", position: 1 });
  });
});
