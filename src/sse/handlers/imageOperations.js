import { Buffer } from "node:buffer";
import { getProviderCredentials, markAccountUnavailable, clearAccountError } from "../services/auth.js";
import { getModelInfo } from "../services/model.js";
import { handleImageOperationCore } from "open-sse/handlers/imageOperationsCore.js";
import { errorResponse, unavailableResponse } from "open-sse/utils/error.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import { requireValidApiKey, ACCOUNT_LEVEL_STATUSES } from "./videoGeneration.js";
import * as log from "../utils/logger.js";

// POST /v1/images/{edits|upscale|background-remove}. Venice is the only provider,
// so a missing model (or plain "venice") means Venice with its default model.
const DEFAULT_PROVIDER = "venice";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // Venice's per-file limit

/** JSON as-is; multipart → JSON with files as base64 (OpenAI SDKs send edits as multipart). */
export async function readImageOperationBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const body = {};
    for (const [rawKey, value] of form.entries()) {
      const key = rawKey.replace(/\[\]$/, ""); // image[] → image (first wins)
      if (body[key] !== undefined) continue;
      if (typeof value === "string") {
        body[key] = value;
      } else {
        if (value.size > MAX_UPLOAD_BYTES) throw new Error(`${key} exceeds ${MAX_UPLOAD_BYTES} bytes`);
        body[key] = Buffer.from(await value.arrayBuffer()).toString("base64");
      }
    }
    return body;
  }
  return await request.json();
}

async function resolveProvider(modelStr) {
  if (!modelStr || modelStr === DEFAULT_PROVIDER) return { provider: DEFAULT_PROVIDER, model: null };
  if (modelStr.startsWith(`${DEFAULT_PROVIDER}/`)) return { provider: DEFAULT_PROVIDER, model: modelStr.slice(DEFAULT_PROVIDER.length + 1) || null };
  const info = await getModelInfo(modelStr);
  if (info?.provider === DEFAULT_PROVIDER) return { provider: info.provider, model: info.model };
  // Bare model id with no provider prefix: Venice is the only image-ops provider.
  if (!modelStr.includes("/")) return { provider: DEFAULT_PROVIDER, model: modelStr };
  return { error: errorResponse(HTTP_STATUS.BAD_REQUEST, `Model '${modelStr}' does not support this image operation. Use venice/<model>.`) };
}

export async function handleImageOperation(request, op) {
  const authError = await requireValidApiKey(request);
  if (authError) return authError;

  let body;
  try {
    body = await readImageOperationBody(request);
  } catch (error) {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, error.message || "Invalid request body");
  }

  const resolved = await resolveProvider(body.model);
  if (resolved.error) return resolved.error;
  const { provider, model } = resolved;
  const binaryOutput = new URL(request.url).searchParams.get("response_format") === "binary";
  const preferredConnectionId = request.headers.get("x-connection-id") || null;

  const excludeConnectionIds = new Set();
  let lastError = null;
  let lastStatus = null;
  while (true) {
    const credentials = await getProviderCredentials(provider, excludeConnectionIds, model, { preferredConnectionId });
    if (!credentials || credentials.allRateLimited) {
      if (credentials?.allRateLimited) {
        const status = lastStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
        return unavailableResponse(status, `[${provider}] ${lastError || credentials.lastError || "Unavailable"}`, credentials.retryAfter, credentials.retryAfterHuman);
      }
      if (excludeConnectionIds.size === 0) return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
      return errorResponse(lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE, lastError || "All accounts unavailable");
    }

    const result = await handleImageOperationCore({ op, provider, model, body, credentials, binaryOutput, signal: request.signal, log });
    if (result.success) {
      await clearAccountError(credentials.connectionId, credentials, model);
      return result.response;
    }
    // Content-policy (422) and bad input (400) are about the request, not the key.
    if (!ACCOUNT_LEVEL_STATUSES.has(result.status)) return result.response;
    const { shouldFallback } = await markAccountUnavailable(credentials.connectionId, result.status, result.error, provider, model);
    if (!shouldFallback) return result.response;
    excludeConnectionIds.add(credentials.connectionId);
    lastError = result.error;
    lastStatus = result.status;
  }
}
