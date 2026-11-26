import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ validateApiKey: vi.fn(), checkApiAuthLock: vi.fn() }));

vi.mock("@/lib/localDb", () => ({
  getSettings: vi.fn(async () => ({ requireLogin: true })),
  validateApiKey: mocks.validateApiKey,
}));
vi.mock("@/shared/utils/machineId", () => ({ getConsistentMachineId: vi.fn(async () => "cli-token") }));
vi.mock("@/lib/auth/dashboardSession", () => ({ verifyDashboardAuthToken: vi.fn(async () => false) }));
vi.mock("@/lib/auth/apiAuthLimiter", () => ({
  checkApiAuthLock: mocks.checkApiAuthLock,
  recordApiAuthFail: vi.fn(),
  recordApiAuthSuccess: vi.fn(),
}));

const { proxy } = await import("../../src/dashboardGuard.js");

const ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";
const call = (path, { method = "GET", ...headers } = {}) =>
  proxy(new NextRequest(`https://router.example.com${path}`, {
    method,
    headers: { host: "router.example.com", origin: ORIGIN, ...headers },
  }));
const preflight = (path, headers = {}) =>
  call(path, { method: "OPTIONS", "access-control-request-method": "GET", ...headers });

describe("CORS on the public LLM API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateApiKey.mockResolvedValue(false);
    mocks.checkApiAuthLock.mockReturnValue({ locked: false });
  });

  it.each(["/v1/models", "/v1/chat/completions", "/api/v1/models", "/v1beta/models", "/codex/responses"])(
    "answers a remote preflight for %s without credentials",
    async (path) => {
      const res = await preflight(path);
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    },
  );

  it("names Authorization explicitly, which the wildcard does not cover", async () => {
    const res = await preflight("/v1/models", { "access-control-request-headers": "authorization,x-custom" });
    expect(res.headers.get("access-control-allow-headers")).toBe("authorization,x-custom");
  });

  it("still demands a key on the actual request, and lets the browser read the 401", async () => {
    const res = await call("/v1/models");
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("lets the browser read a lockout", async () => {
    mocks.checkApiAuthLock.mockReturnValue({ locked: true, retryAfter: 30 });
    const res = await call("/v1/models", { authorization: "Bearer bad" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("does not exempt an OPTIONS request that is not a preflight", async () => {
    expect((await call("/v1/models", { method: "OPTIONS" })).status).toBe(401);
  });

  it.each(["/api/keys", "/api/settings", "/api/shutdown", "/v1evil"])(
    "does not extend CORS to %s",
    async (path) => {
      const res = await preflight(path);
      expect(res.status).not.toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    },
  );
});
