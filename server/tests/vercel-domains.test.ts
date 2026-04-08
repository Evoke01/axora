import { afterEach, describe, expect, test, vi } from "vitest";
import type { AppConfig } from "../src/config.js";
import { VercelDomainProvider } from "../src/vercel-domains.js";

const baseConfig: AppConfig = {
  NODE_ENV: "test",
  PORT: 4000,
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  CLIENT_ORIGIN: "http://localhost:5173",
  WEBSITE_ORIGIN: "http://localhost:3000",
  PLATFORM_ROOT_DOMAIN: "sites.axora.app",
  APP_BASE_URL: "http://localhost:4000",
  SESSION_SECRET: "test-secret",
  EMAIL_MODE: "demo",
  RESEND_API_KEY: undefined,
  RESEND_FROM_EMAIL: "Axora <onboarding@resend.dev>",
  SUPPORT_EMAIL: "sales@axora.app",
  SUPABASE_URL: undefined,
  SUPABASE_SERVICE_ROLE_KEY: undefined,
  SUPABASE_STORAGE_BUCKET: "site-assets",
  VERCEL_API_TOKEN: "vercel-token",
  VERCEL_PROJECT_ID: "prj_123",
  VERCEL_TEAM_ID: "team_123",
  VERCEL_TEAM_SLUG: undefined,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("VercelDomainProvider", () => {
  test("creates, verifies, and removes a project domain through the Vercel API", async () => {
    const provider = new VercelDomainProvider(baseConfig);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "www.peakformclub.com",
            verified: false,
            verification: [
              {
                type: "TXT",
                domain: "_vercel.www.peakformclub.com",
                value: "vc-domain-verify=abc123",
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ verified: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "www.peakformclub.com",
            verified: true,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const created = await provider.createDomain("www.peakformclub.com");
    expect(created.status).toBe("pending_verification");
    expect(created.verification.cnameName).toBe("_vercel.www.peakformclub.com");
    expect(created.verification.verificationToken).toBe("vc-domain-verify=abc123");

    const verified = await provider.verifyDomain("www.peakformclub.com");
    expect(verified.status).toBe("active");
    expect(verified.verification.instructions[0]).toContain("Domain connected");

    await provider.removeDomain("www.peakformclub.com");

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0].toString()).toContain("/v10/projects/prj_123/domains");
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain("/v9/projects/prj_123/domains/www.peakformclub.com/verify");
    expect(fetchMock.mock.calls[2]?.[0].toString()).toContain("/v9/projects/prj_123/domains/www.peakformclub.com");
    expect(fetchMock.mock.calls[3]?.[0].toString()).toContain("/v9/projects/prj_123/domains/www.peakformclub.com");
  });
});
