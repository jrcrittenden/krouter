import { handleMusicGet } from "@/sse/handlers/musicGeneration.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** GET /v1/audio/generations/{request_id} - poll a music / sound-effect job */
export async function GET(request, { params }) {
  const { id } = await params;
  return await handleMusicGet(request, id);
}
