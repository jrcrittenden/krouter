// Image operations on an existing image: edit, upscale, background removal.
//
// Venice is the only provider today (POST /image/edit, /image/upscale,
// /image/background-remove). All three return the result as binary; it comes
// back to the client in OpenAI's images shape ({ created, data: [{ b64_json }] }),
// or as raw bytes when the route is called with ?response_format=binary.
//
// Source images are forwarded as given (base64, data URL or http(s) URL). Venice
// fetches URLs itself, so kRouter never dereferences a client-supplied URL here.

import { Buffer } from "node:buffer";
import { createErrorResult, parseUpstreamError } from "../utils/error.js";
import { HTTP_STATUS } from "../config/runtimeConfig.js";

const VENICE_API = "https://api.venice.ai/api/v1";
export const IMAGE_OPERATIONS = new Set(["edit", "upscale", "background-remove"]);

const EDIT_FIELDS = ["prompt", "aspect_ratio", "resolution", "output_format", "safe_mode", "transparent_background", "enhance_prompt", "disable_prompt_optimization_thinking"];

/** Client body → Venice request body for the operation. Throws on bad input. */
export function buildVeniceOperationBody(op, model, body) {
  if (op === "edit") {
    if (!body.prompt) throw new Error("Missing required field: prompt");
    if (!body.image) throw new Error("Missing required field: image");
    if (body.mask) throw new Error("Venice image edit does not take a mask; describe the change in the prompt");
    const out = { image: body.image };
    if (model) out.model = model;
    for (const k of EDIT_FIELDS) if (body[k] !== undefined) out[k] = body[k];
    // Venice rejects `quality` on /image/edit (400); OpenAI clients send it routinely.
    return out;
  }
  if (op === "upscale") {
    if (!body.image) throw new Error("Missing required field: image");
    const out = { image: body.image };
    if (body.scale !== undefined) out.scale = Number(body.scale);
    if (body.creativity !== undefined) out.creativity = Number(body.creativity);
    return out;
  }
  if (op === "background-remove") {
    if (body.image_url) return { image_url: body.image_url };
    if (body.image) {
      // An http(s) "image" is a URL to Venice's image_url field; anything else is base64.
      return /^https?:\/\//i.test(body.image) ? { image_url: body.image } : { image: body.image };
    }
    throw new Error("Missing required field: image (or image_url)");
  }
  throw new Error(`Unknown image operation: ${op}`);
}

function imageResponse(buf, contentType, { binaryOutput, responseFormat }) {
  if (binaryOutput) {
    return {
      success: true,
      response: new Response(buf, {
        headers: { "Content-Type": contentType, "Content-Length": String(buf.length), "Access-Control-Allow-Origin": "*" },
      }),
    };
  }
  const b64 = buf.toString("base64");
  const item = responseFormat === "url" ? { url: `data:${contentType};base64,${b64}` } : { b64_json: b64 };
  return {
    success: true,
    response: new Response(JSON.stringify({ created: Math.floor(Date.now() / 1000), data: [item] }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    }),
  };
}

/**
 * @param {object} o
 * @param {"edit"|"upscale"|"background-remove"} o.op
 * @param {string} o.provider
 * @param {string|null} o.model
 * @param {object} o.body - JSON-shaped client body (multipart already converted)
 * @param {object} o.credentials
 * @param {boolean} [o.binaryOutput]
 */
export async function handleImageOperationCore({ op, provider, model, body, credentials, binaryOutput = false, signal, log }) {
  if (!IMAGE_OPERATIONS.has(op)) return createErrorResult(HTTP_STATUS.BAD_REQUEST, `Unknown image operation: ${op}`);
  if (provider !== "venice") return createErrorResult(HTTP_STATUS.BAD_REQUEST, `Provider '${provider}' does not support image ${op}`);

  const token = credentials?.apiKey || credentials?.accessToken;
  if (!token) return createErrorResult(HTTP_STATUS.UNAUTHORIZED, `No credentials for provider: ${provider}`);

  let requestBody;
  try {
    requestBody = buildVeniceOperationBody(op, model, body);
  } catch (error) {
    return createErrorResult(HTTP_STATUS.BAD_REQUEST, error.message);
  }

  log?.debug?.("IMAGE", `${provider.toUpperCase()} | ${op}${model ? ` | ${model}` : ""}`);

  let res;
  try {
    res = await fetch(`${VENICE_API}/image/${op}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestBody),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(180000)]) : AbortSignal.timeout(180000),
    });
  } catch (error) {
    return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `[${provider}] image ${op} failed: ${error.message}`);
  }

  if (!res.ok) {
    const { statusCode, message } = await parseUpstreamError(res);
    return createErrorResult(statusCode, `[${provider}${model ? `/${model}` : ""}] image ${op}: ${message}`);
  }

  const contentType = (res.headers.get("content-type") || "image/png").split(";")[0].trim();
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `[${provider}] image ${op} returned an empty body`);
  return imageResponse(buf, contentType, { binaryOutput, responseFormat: body.response_format });
}
