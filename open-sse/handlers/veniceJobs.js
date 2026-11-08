// Venice async media jobs — video (/video/*) and music/SFX (/audio/*).
//
// Venice's flow: POST /{kind}/queue → { queue_id } ; POST /{kind}/retrieve { queue_id }
// → JSON { status: "PROCESSING" } while running, then either the finished file as
// a binary body (video/mp4, audio/mpeg|wav|flac) or JSON { status: "COMPLETED",
// download_url } for externally hosted models. Branch on Content-Type.
//
// kRouter exposes these with xAI's job contract (POST returns { request_id },
// GET /…/{id} returns { status: "pending" | "done", video|audio: { url } }). A
// binary result is returned inline as a base64 data URL so every client gets JSON.
//
// The job id handed to clients is "venice:<model>:<queue_id>": the poll route has no
// other way to know the provider, and /audio/retrieve requires the model.
//
// Polls never call /complete (which deletes the media): a client that loses the
// final response can poll again. Venice expires stored media on its own.

import { Buffer } from "node:buffer";
import { createErrorResult } from "../utils/error.js";
import { HTTP_STATUS } from "../config/runtimeConfig.js";
import { VENICE_VIDEO_MODELS, VENICE_MUSIC_MODELS } from "../config/veniceModels.js";

const API = "https://api.venice.ai/api/v1";
export const VENICE_JOB_PREFIX = "venice:";
const FETCH_TIMEOUT_MS = Number(process.env.VIDEO_FETCH_TIMEOUT_MS || 120000);
// A finished file is held in memory and base64'd into JSON (~1.33x). Bound it.
export const INLINE_MAX_BYTES = Number(process.env.VENICE_INLINE_MEDIA_MAX_BYTES || 100 * 1024 * 1024);

const videoById = new Map(VENICE_VIDEO_MODELS.map((m) => [m.id, m]));
const musicById = new Map(VENICE_MUSIC_MODELS.map((m) => [m.id, m]));

export function isVeniceMusicModel(id) {
  return musicById.has(id);
}

export function encodeJobId(model, queueId) {
  return `${VENICE_JOB_PREFIX}${model}:${queueId}`;
}

/** "venice:<model>:<queue_id>" → { model, queueId } | null. Model ids never contain ":". */
export function decodeJobId(jobId) {
  if (typeof jobId !== "string" || !jobId.startsWith(VENICE_JOB_PREFIX)) return null;
  const rest = jobId.slice(VENICE_JOB_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0 || sep === rest.length - 1) return null;
  return { model: rest.slice(0, sep), queueId: rest.slice(sep + 1) };
}

// ── Request mapping ─────────────────────────────────────────────

/** xAI-style video body → Venice /video/queue body. */
export function buildVideoQueueBody(model, body) {
  const out = { ...body, model };
  // xAI sends duration as seconds (number); Venice takes "5s" strings from a per-model list.
  if (typeof out.duration === "number" && Number.isFinite(out.duration)) out.duration = `${Math.round(out.duration)}s`;
  else if (typeof out.duration === "string" && /^\d+$/.test(out.duration)) out.duration = `${out.duration}s`;
  if (out.duration === undefined) {
    const durations = videoById.get(model)?.durations;
    if (durations?.length) out.duration = durations[0];
  }
  // xAI image-to-video sends image: { url }; Venice wants image_url.
  if (out.image_url === undefined && typeof out.image?.url === "string") out.image_url = out.image.url;
  if (out.video_url === undefined && typeof out.video?.url === "string") out.video_url = out.video.url;
  delete out.image;
  delete out.video;
  return out;
}

const MUSIC_FIELDS = ["prompt", "lyrics_prompt", "duration_seconds", "force_instrumental", "lyrics_optimizer", "loop", "voice", "language_code", "speed"];

/** Client music body (Venice-native fields, plus friendly aliases) → /audio/queue body. */
export function buildMusicQueueBody(model, body) {
  const src = { ...body };
  if (src.lyrics_prompt === undefined && src.lyrics !== undefined) src.lyrics_prompt = src.lyrics;
  if (src.duration_seconds === undefined && src.duration !== undefined) src.duration_seconds = src.duration;
  if (src.force_instrumental === undefined && src.instrumental !== undefined) src.force_instrumental = src.instrumental;
  // /audio/queue is additionalProperties:false — forward only known fields.
  const out = { model };
  for (const k of MUSIC_FIELDS) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

// ── Upstream calls ──────────────────────────────────────────────

function combineSignals(signal, timeoutMs) {
  const t = AbortSignal.timeout(timeoutMs);
  return signal && typeof AbortSignal.any === "function" ? AbortSignal.any([signal, t]) : (signal || t);
}

function jsonResult(payload, status = 200) {
  return {
    success: true,
    response: new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    }),
  };
}

async function upstreamErrorResult(res, label) {
  const text = await res.text().catch(() => "");
  let msg = text || `HTTP ${res.status}`;
  try {
    const j = JSON.parse(text);
    const e = j?.error;
    msg = (typeof e === "string" ? e : e?.message) || j?.message || msg;
  } catch { /* plain text */ }
  return createErrorResult(res.status, `[venice] ${label}: ${String(msg).slice(0, 2000)}`);
}

async function post(path, payload, token, signal) {
  return fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal: combineSignals(signal, FETCH_TIMEOUT_MS),
  });
}

function tokenOf(credentials) {
  return credentials?.apiKey || credentials?.accessToken || null;
}

function fetchFailure(error, label) {
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return createErrorResult(HTTP_STATUS.REQUEST_TIMEOUT, `[venice] ${label} aborted: ${error.message}`);
  }
  return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `[venice] ${label} failed: ${error.message}`);
}

/**
 * Submit a job. kind: "video" | "audio". queueBody is already Venice-shaped.
 * Never retried here: a POST that reached Venice may have created a billable job.
 */
export async function veniceQueue({ kind, model, queueBody, credentials, signal }) {
  const token = tokenOf(credentials);
  if (!token) return createErrorResult(HTTP_STATUS.UNAUTHORIZED, "No Venice API key configured");

  let res;
  try {
    res = await post(`/${kind}/queue`, queueBody, token, signal);
  } catch (error) {
    return fetchFailure(error, `${kind} queue`);
  }
  if (!res.ok) return upstreamErrorResult(res, `${kind} queue`);

  const data = await res.json().catch(() => null);
  if (!data?.queue_id) return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `[venice] ${kind} queue returned no queue_id`);
  const requestId = encodeJobId(data.model || model, data.queue_id);
  return jsonResult({ request_id: requestId, id: requestId, status: "pending", model: data.model || model, queue_id: data.queue_id });
}

/** Read a body into memory, refusing to buffer past maxBytes. */
async function readCapped(res, maxBytes) {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return { tooLarge: true, size: declared };
  if (!res.body?.getReader) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > maxBytes ? { tooLarge: true, size: buf.length } : { buf };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) return { tooLarge: true, size: total };
      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return { buf: Buffer.concat(chunks) };
}

/**
 * Poll a job. Returns xAI-shaped JSON:
 *   { request_id, status: "pending", progress? }
 *   { request_id, status: "done", video|audio: { url, content_type?, size_bytes? } }
 */
export async function veniceRetrieve({ kind, jobId, credentials, signal, maxInlineBytes = INLINE_MAX_BYTES }) {
  const job = decodeJobId(jobId);
  if (!job) return createErrorResult(HTTP_STATUS.BAD_REQUEST, `Not a Venice job id: ${jobId}`);
  const token = tokenOf(credentials);
  if (!token) return createErrorResult(HTTP_STATUS.UNAUTHORIZED, "No Venice API key configured");

  const payload = { queue_id: job.queueId };
  if (kind === "audio") payload.model = job.model; // required by /audio/retrieve

  let res;
  try {
    res = await post(`/${kind}/retrieve`, payload, token, signal);
  } catch (error) {
    return fetchFailure(error, `${kind} retrieve`);
  }
  if (!res.ok) return upstreamErrorResult(res, `${kind} retrieve`);

  const field = kind === "video" ? "video" : "audio";
  const ctype = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();

  if (ctype === "application/json" || ctype.endsWith("+json")) {
    const data = await res.json().catch(() => ({}));
    if (data.status === "PROCESSING" || data.status === "QUEUED") {
      const avg = Number(data.average_execution_time);
      const ran = Number(data.execution_duration);
      const out = { request_id: jobId, status: "pending", model: job.model };
      if (avg > 0 && ran >= 0) out.progress = Math.min(99, Math.round((ran / avg) * 100));
      if (Number.isFinite(avg)) out.average_execution_time_ms = avg;
      if (Number.isFinite(ran)) out.execution_duration_ms = ran;
      return jsonResult(out);
    }
    if (data.status === "COMPLETED" && typeof data.download_url === "string") {
      return jsonResult({ request_id: jobId, status: "done", model: job.model, [field]: { url: data.download_url } });
    }
    // Undocumented state: pass it through rather than guess.
    return jsonResult({ request_id: jobId, status: String(data.status || "unknown").toLowerCase(), model: job.model, upstream: data });
  }

  // Binary: the finished file.
  const read = await readCapped(res, maxInlineBytes);
  if (read.tooLarge) {
    return createErrorResult(
      HTTP_STATUS.BAD_GATEWAY,
      `[venice] finished ${field} is ${read.size} bytes, over the ${maxInlineBytes}-byte inline limit (VENICE_INLINE_MEDIA_MAX_BYTES). Raise the limit and poll again; the job is kept upstream.`,
    );
  }
  const contentType = ctype || (kind === "video" ? "video/mp4" : "audio/mpeg");
  return jsonResult({
    request_id: jobId,
    status: "done",
    model: job.model,
    [field]: { url: `data:${contentType};base64,${read.buf.toString("base64")}`, content_type: contentType, size_bytes: read.buf.length },
  });
}
