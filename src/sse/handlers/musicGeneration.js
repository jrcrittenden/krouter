import { getProviderCredentials, markAccountUnavailable, clearAccountError } from "../services/auth.js";
import { getModelInfo } from "../services/model.js";
import { veniceQueue, veniceRetrieve, buildMusicQueueBody, decodeJobId, isVeniceMusicModel } from "open-sse/handlers/veniceJobs.js";
import { errorResponse, unavailableResponse } from "open-sse/utils/error.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";
import { requireValidApiKey, withConnectionHeader, ACCOUNT_LEVEL_STATUSES } from "./videoGeneration.js";
import * as log from "../utils/logger.js";

// Music / sound-effect generation. Venice is the only provider today, so the job
// contract is the one ./videoGeneration.js uses for xAI and Venice video:
//   POST /v1/audio/generations  { model, prompt, lyrics?, duration?, instrumental?, ... }
//     → { request_id, status: "pending" }
//   GET  /v1/audio/generations/{request_id}
//     → { status: "pending", progress? } | { status: "done", audio: { url: "data:audio/...;base64,..." } }
const MUSIC_PROVIDERS = new Set(["venice"]);

async function resolveMusicModel(modelStr) {
  if (!modelStr) return { error: errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing model") };
  const info = await getModelInfo(String(modelStr));
  if (info?.provider && MUSIC_PROVIDERS.has(info.provider)) return { provider: info.provider, model: info.model };
  // Bare id ("elevenlabs-music-v2"): accept it when it is a known Venice music model.
  if (!String(modelStr).includes("/") && isVeniceMusicModel(String(modelStr))) return { provider: "venice", model: String(modelStr) };
  return { error: errorResponse(HTTP_STATUS.BAD_REQUEST, `Model '${modelStr}' is not a music model. Use venice/<model>, e.g. venice/elevenlabs-music-v2.`) };
}

/** POST /v1/audio/generations — submit a music/SFX job. */
export async function handleMusicCreate(request) {
  const authError = await requireValidApiKey(request);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }
  if (!body?.prompt) return errorResponse(HTTP_STATUS.BAD_REQUEST, "Missing required field: prompt");

  const resolved = await resolveMusicModel(body.model);
  if (resolved.error) return resolved.error;
  const { provider, model } = resolved;
  const queueBody = buildMusicQueueBody(model, body);
  const preferredConnectionId = request.headers.get("x-connection-id") || null;

  // Rotate accounts only on failures Venice rejects before creating a job.
  const excludeConnectionIds = new Set();
  let lastError = null;
  let lastStatus = null;
  while (true) {
    const credentials = await getProviderCredentials(provider, excludeConnectionIds, model, { preferredConnectionId });
    if (!credentials || credentials.allRateLimited) {
      if (credentials?.allRateLimited) {
        const status = lastStatus || Number(credentials.lastErrorCode) || HTTP_STATUS.SERVICE_UNAVAILABLE;
        return unavailableResponse(status, `[${provider}/${model}] ${lastError || credentials.lastError || "Unavailable"}`, credentials.retryAfter, credentials.retryAfterHuman);
      }
      if (excludeConnectionIds.size === 0) return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);
      return errorResponse(lastStatus || HTTP_STATUS.SERVICE_UNAVAILABLE, lastError || "All accounts unavailable");
    }

    const result = await veniceQueue({ kind: "audio", model, queueBody, credentials, signal: request.signal });
    if (result.success) {
      await clearAccountError(credentials.connectionId, credentials, model);
      log.info("MUSIC", `${provider.toUpperCase()} | ${model} queued (connection ${credentials.connectionId})`);
      return withConnectionHeader(result.response, credentials.connectionId);
    }

    if (!ACCOUNT_LEVEL_STATUSES.has(result.status)) return result.response;
    const { shouldFallback } = await markAccountUnavailable(credentials.connectionId, result.status, result.error, provider, model);
    if (!shouldFallback) return result.response;
    excludeConnectionIds.add(credentials.connectionId);
    lastError = result.error;
    lastStatus = result.status;
  }
}

/** GET /v1/audio/generations/{id} — poll a music/SFX job (pin the account with x-connection-id). */
export async function handleMusicGet(request, requestId) {
  const authError = await requireValidApiKey(request);
  if (authError) return authError;

  const job = decodeJobId(requestId);
  if (!job) return errorResponse(HTTP_STATUS.BAD_REQUEST, `Unknown music job id: ${requestId}`);
  const provider = "venice";
  const preferredConnectionId = request.headers.get("x-connection-id") || null;

  const credentials = await getProviderCredentials(provider, null, null, { preferredConnectionId });
  if (!credentials || credentials.allRateLimited) return errorResponse(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${provider}`);

  const result = await veniceRetrieve({ kind: "audio", jobId: requestId, credentials, signal: request.signal });
  if (result.success) return withConnectionHeader(result.response, credentials.connectionId);
  if (ACCOUNT_LEVEL_STATUSES.has(result.status)) {
    await markAccountUnavailable(credentials.connectionId, result.status, result.error, provider, null);
  }
  return result.response;
}
