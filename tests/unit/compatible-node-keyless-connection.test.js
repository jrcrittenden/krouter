import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;

async function setup(nodeData) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "krouter-keyless-node-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  vi.doMock("next/server", () => ({
    NextResponse: {
      json(body, init = {}) {
        return new Response(JSON.stringify(body), { status: init.status || 200, headers: { "Content-Type": "application/json" } });
      },
    },
  }));
  const { POST } = await import("@/app/api/providers/route.js");
  const { PUT } = await import("@/app/api/providers/[id]/route.js");
  const { createProviderNode, getProviderConnectionById } = await import("@/models/index.js");
  const node = await createProviderNode(nodeData);
  return { node, POST, PUT, getProviderConnectionById, cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }) };
}

const post = (provider, extra = {}) => new Request("https://krouter.local/api/providers", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ provider, name: "Gateway", defaultModel: "m", ...extra }),
});

const put = (id, body) => [
  new Request(`https://krouter.local/api/providers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  { params: Promise.resolve({ id }) },
];

let seq = 0;
const OPENAI_NODE = () => ({ id: `openai-compatible-keyless-${++seq}`, type: "openai-compatible", name: "Keyless", prefix: "kl", apiType: "chat", baseUrl: "http://gateway.lan/v1" });
const ANTHROPIC_NODE = () => ({ id: `anthropic-compatible-keyed-${++seq}`, type: "anthropic-compatible", name: "Keyed", prefix: "kd", baseUrl: "https://anthropic.test/v1" });

describe("keyless OpenAI-compatible node connections", () => {
  let cleanup = () => {};
  afterEach(() => {
    vi.doUnmock("next/server");
    vi.resetModules();
    cleanup();
    cleanup = () => {};
    if (originalDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = originalDataDir;
  });

  it("creates an OpenAI-compatible node connection without an API key", async () => {
    const ctx = await setup(OPENAI_NODE());
    cleanup = ctx.cleanup;
    const res = await ctx.POST(post(ctx.node.id));
    expect(res.status).toBe(201);
    const { connection } = await res.json();
    expect((await ctx.getProviderConnectionById(connection.id)).apiKey).toBe("");
  });

  it("still requires a key for Anthropic-compatible nodes", async () => {
    const ctx = await setup(ANTHROPIC_NODE());
    cleanup = ctx.cleanup;
    const res = await ctx.POST(post(ctx.node.id));
    expect(res.status).toBe(400);
  });

  it("clears a stored key on an OpenAI-compatible node when asked", async () => {
    const ctx = await setup(OPENAI_NODE());
    cleanup = ctx.cleanup;
    const created = await ctx.POST(post(ctx.node.id, { apiKey: "dummy" }));
    expect(created.status).toBe(201);
    const { connection } = await created.json();
    expect((await ctx.getProviderConnectionById(connection.id)).apiKey).toBe("dummy");

    const res = await ctx.PUT(...put(connection.id, { clearApiKey: true }));
    expect(res.status).toBe(200);
    expect((await ctx.getProviderConnectionById(connection.id)).apiKey).toBe("");
  });

  it("ignores clearApiKey on other providers and when a new key is supplied", async () => {
    const ctx = await setup(ANTHROPIC_NODE());
    cleanup = ctx.cleanup;
    const { connection } = await (await ctx.POST(post(ctx.node.id, { apiKey: "k1" }))).json();
    await ctx.PUT(...put(connection.id, { clearApiKey: true }));
    expect((await ctx.getProviderConnectionById(connection.id)).apiKey).toBe("k1");
    await ctx.PUT(...put(connection.id, { apiKey: "k2", clearApiKey: true }));
    expect((await ctx.getProviderConnectionById(connection.id)).apiKey).toBe("k2");
  });
});
