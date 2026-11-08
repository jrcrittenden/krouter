import { handleMusicCreate } from "@/sse/handlers/musicGeneration.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/audio/generations - async music / sound-effect generation (Venice) */
export async function POST(request) {
  return await handleMusicCreate(request);
}
