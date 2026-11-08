import { handleImageOperation } from "@/sse/handlers/imageOperations.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

/** POST /v1/images/upscale - image upscale, 2x or 4x (Venice) */
export async function POST(request) {
  return await handleImageOperation(request, "upscale");
}
