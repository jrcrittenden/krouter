// Custom OpenAI-compatible nodes (openai-compatible-*): POST {baseUrl}/audio/speech.
//
// Unlike the openai adapter, the model id is passed through untouched: a self-hosted
// gateway's TTS models (qwen3-tts, chatterbox-turbo, ...) are not OpenAI's, so treating an
// unknown id as a voice name would be wrong. "model/voice" still selects a voice unless the
// id is a registered model or the body names a voice (see splitModelVoice).
// The API key is optional; tailnet and LAN gateways often run without one.
import { Buffer } from "node:buffer";

const FORMATS = new Set(["mp3", "opus", "aac", "flac", "wav", "pcm"]);
const CT_TO_FORMAT = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/flac": "flac", "audio/aac": "aac", "audio/ogg": "opus", "audio/opus": "opus", "audio/pcm": "pcm", "audio/l16": "pcm" };

export function nodeBaseUrl(credentials) {
  const raw = credentials?.providerSpecificData?.baseUrl;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Resolve the upstream model id and voice.
 *
 * Gateway model ids may be namespaced ("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"), so a slash
 * is only read as a "model/voice" suffix when nothing else disambiguates:
 *   1. the full id is one of the node's registered models → pass it through untouched;
 *   2. the request carries a body voice → pass the id through untouched and use that voice;
 *   3. otherwise the text after the last slash is the voice.
 */
export function splitModelVoice(model, bodyVoice, knownModels) {
  const voice = bodyVoice || undefined;
  if (typeof model !== "string") return { model, voice };
  if (voice || knownModels?.has?.(model)) return { model, voice };
  const slash = model.lastIndexOf("/");
  if (slash > 0 && slash < model.length - 1) return { model: model.slice(0, slash), voice: model.slice(slash + 1) };
  return { model, voice: undefined };
}

export default {
  async synthesize(text, model, credentials, _responseFormat, options = {}) {
    const base = nodeBaseUrl(credentials);
    if (!base) throw new Error("This provider has no base URL configured");

    const { model: ttsModel, voice } = splitModelVoice(model, options.voice, options.knownModels);
    const body = { model: ttsModel, input: text };
    if (voice) body.voice = voice;
    if (FORMATS.has(options.audioFormat)) body.response_format = options.audioFormat;
    const speed = Number(options.speed);
    if (Number.isFinite(speed) && speed > 0) body.speed = speed;

    const headers = { "Content-Type": "application/json" };
    if (credentials?.apiKey) headers.Authorization = `Bearer ${credentials.apiKey}`;

    const res = await fetch(`${base}/audio/speech`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let msg = txt;
      try {
        const j = JSON.parse(txt);
        const e = j?.error ?? j?.detail;
        msg = typeof e === "string" ? e : e?.message || JSON.stringify(e ?? j);
      } catch { /* plain text */ }
      throw new Error(`TTS failed (${res.status}): ${String(msg || "").slice(0, 500)}`);
    }
    const ct = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const format = CT_TO_FORMAT[ct] || body.response_format || "mp3";
    const buf = await res.arrayBuffer();
    return { base64: Buffer.from(buf).toString("base64"), format };
  },
};
