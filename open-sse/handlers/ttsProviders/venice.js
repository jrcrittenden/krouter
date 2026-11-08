// Venice TTS — POST /audio/speech (OpenAI-shaped body, binary audio back).
//
// Model string: "tts-kokoro/af_sky", or a bare model id with the voice in the
// request body. Voices are per model and most models publish no default_voice,
// so the fallback is the model's first catalog voice; "alloy" would be a 400.
import { Buffer } from "node:buffer";
import { throwUpstreamError } from "./_base.js";
import { VENICE_TTS_MODELS } from "../../config/veniceModels.js";

const SPEECH_URL = "https://api.venice.ai/api/v1/audio/speech";
const DEFAULT_MODEL = "tts-kokoro";
const KOKORO_DEFAULT_VOICE = "af_sky"; // Venice's documented default
const AUDIO_FORMATS = new Set(["mp3", "opus", "aac", "flac", "wav", "pcm"]);
const CONTENT_TYPE_FORMAT = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/flac": "flac", "audio/aac": "aac", "audio/opus": "opus", "audio/ogg": "opus", "audio/pcm": "pcm" };

const byId = new Map(VENICE_TTS_MODELS.map((m) => [m.id, m]));

function defaultVoice(modelId) {
  const m = byId.get(modelId);
  if (m?.defaultVoice) return m.defaultVoice;
  if (modelId === DEFAULT_MODEL && m?.voices?.includes(KOKORO_DEFAULT_VOICE)) return KOKORO_DEFAULT_VOICE;
  return m?.voices?.[0] || null;
}

export function parseVeniceModelVoice(model, bodyVoice) {
  const voiceFromBody = typeof bodyVoice === "string" && bodyVoice.trim() ? bodyVoice.trim() : null;
  if (!model) return { modelId: DEFAULT_MODEL, voice: voiceFromBody || defaultVoice(DEFAULT_MODEL) };
  const slash = model.indexOf("/");
  if (slash > 0) return { modelId: model.slice(0, slash), voice: model.slice(slash + 1) || voiceFromBody || defaultVoice(model.slice(0, slash)) };
  if (byId.has(model) || model.startsWith("tts-")) return { modelId: model, voice: voiceFromBody || defaultVoice(model) };
  // A bare non-model string is a Kokoro voice name (OpenAI adapter convention).
  return { modelId: DEFAULT_MODEL, voice: model };
}

export default {
  async synthesize(text, model, credentials, _responseFormat, options = {}) {
    if (!credentials?.apiKey) throw new Error("No Venice API key configured");
    const { modelId, voice } = parseVeniceModelVoice(model, options.voice);

    const body = { model: modelId, input: text };
    if (voice) body.voice = voice;
    // Omit response_format unless asked: defaults differ per model (Inworld/Orpheus are wav-only).
    if (typeof options.audioFormat === "string" && AUDIO_FORMATS.has(options.audioFormat)) body.response_format = options.audioFormat;
    const speed = Number(options.speed);
    if (options.speed != null && Number.isFinite(speed)) body.speed = Math.min(4, Math.max(0.25, speed));
    if (typeof options.language === "string" && options.language.trim()) body.language = options.language.trim();

    const res = await fetch(SPEECH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${credentials.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwUpstreamError(res);
    const ctype = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) throw new Error("Venice returned empty audio");
    const format = CONTENT_TYPE_FORMAT[ctype] || body.response_format || byId.get(modelId)?.defaultFormat || "mp3";
    return { base64: Buffer.from(buf).toString("base64"), format };
  },
};
