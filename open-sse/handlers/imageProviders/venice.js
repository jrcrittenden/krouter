// Venice image generation — native POST /image/generate.
//
// Not the OpenAI-compatible /images/generations: that endpoint caps n at 1 and
// silently swaps an unknown model for Venice's default image model, so a typo
// would bill a different model without an error. The native route rejects
// unknown models and returns up to 4 variants as base64 in `images[]`.
import { nowSec } from "./_base.js";
import { VENICE_IMAGE_MODELS } from "../../config/veniceModels.js";

const URL_GENERATE = "https://api.venice.ai/api/v1/image/generate";
const MAX_SIDE = 1280; // Venice width/height ceiling
const SIDE_DIVISOR = 16;
const FORMATS = new Set(["jpeg", "png", "webp"]);
// Native fields forwarded verbatim when the client sends them.
const PASSTHROUGH = [
  "negative_prompt", "aspect_ratio", "resolution", "quality", "seed", "steps", "cfg_scale",
  "lora_strength", "style_preset", "hide_watermark", "embed_exif_metadata", "safe_mode",
  "enable_web_search", "enhance_prompt", "transparent_background", "style_references",
];

const byId = new Map(VENICE_IMAGE_MODELS.map((m) => [m.id, m]));

function parseSize(size) {
  const m = typeof size === "string" && /^(\d{2,5})x(\d{2,5})$/.exec(size.trim());
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

// Closest published aspect ratio to the requested WxH (by log-ratio distance).
export function nearestAspectRatio(w, h, ratios) {
  const target = Math.log(w / h);
  let best = null;
  let bestDist = Infinity;
  for (const r of ratios) {
    const m = /^(\d+):(\d+)$/.exec(r);
    if (!m) continue;
    const dist = Math.abs(Math.log(Number(m[1]) / Number(m[2])) - target);
    if (dist < bestDist) { best = r; bestDist = dist; }
  }
  return best;
}

// Scale WxH so the long side fits Venice's 1280 ceiling, keeping the ratio, on a /16 grid.
export function fitDimensions(w, h) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const snap = (v) => Math.max(SIDE_DIVISOR, Math.floor((v * scale) / SIDE_DIVISOR) * SIDE_DIVISOR);
  return { width: snap(w), height: snap(h) };
}

export function buildVeniceImageBody(model, body) {
  const req = { model, prompt: body.prompt, return_binary: false };
  const fmt = String(body.output_format || "png").toLowerCase().replace("jpg", "jpeg");
  // Venice defaults to webp; pin the format so the binary route's MIME (from output_format) matches.
  req.format = FORMATS.has(fmt) ? fmt : "png";

  const n = Number(body.n ?? 1);
  if (Number.isInteger(n) && n > 1) req.variants = Math.min(4, n);

  for (const key of PASSTHROUGH) if (body[key] !== undefined) req[key] = body[key];

  const size = parseSize(body.size);
  if (size && req.aspect_ratio === undefined && req.width === undefined) {
    const ratios = byId.get(model)?.aspectRatios?.filter((r) => r !== "auto");
    if (ratios?.length) {
      const ar = nearestAspectRatio(size.w, size.h, ratios);
      if (ar) req.aspect_ratio = ar;
    } else {
      Object.assign(req, fitDimensions(size.w, size.h));
    }
  }
  return req;
}

export default {
  buildUrl: () => URL_GENERATE,
  buildHeaders: (creds) => {
    const headers = { "Content-Type": "application/json" };
    const key = creds?.apiKey || creds?.accessToken;
    if (key) headers.Authorization = `Bearer ${key}`;
    return headers;
  },
  buildBody: (model, body) => buildVeniceImageBody(model, body),
  normalize: (responseBody, _prompt, body = {}) => {
    const images = Array.isArray(responseBody?.images) ? responseBody.images : [];
    const asUrl = body?.response_format === "url";
    const fmt = String(body?.output_format || "png").toLowerCase().replace("jpg", "jpeg");
    const mime = FORMATS.has(fmt) ? `image/${fmt}` : "image/png";
    return {
      created: nowSec(),
      data: images.map((b64) => (asUrl ? { url: `data:${mime};base64,${b64}` } : { b64_json: b64 })),
    };
  },
};
