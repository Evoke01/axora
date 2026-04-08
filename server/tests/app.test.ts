import type { BookingInput, BusinessCreateResult, DashboardPayload } from "@business-automation/shared";
import { newDb } from "pg-mem";
import request from "supertest";
import { afterEach, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";
import { applySchema } from "../src/db.js";
import { EmailService } from "../src/email.js";
import { Repository } from "../src/repository.js";
import { Scheduler } from "../src/scheduler.js";
import { BookingService } from "../src/service.js";
import type { WebsiteDomainProvider } from "../src/vercel-domains.js";

type Harness = Awaited<ReturnType<typeof createHarness>>;

const harnesses: Harness[] = [];

async function createHarness(
  overrides: Partial<AppConfig> = {},
  startScheduler = false,
  domainProvider: WebsiteDomainProvider | null = null,
) {
  const db = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();
  await applySchema(pool);

  const config: AppConfig = {
    NODE_ENV: "test",
    PORT: 4000,
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    CLIENT_ORIGIN: "http://localhost:5173",
    WEBSITE_ORIGIN: "http://localhost:3000",
    PLATFORM_ROOT_DOMAIN: "axora.localhost",
    APP_BASE_URL: "http://localhost:4000",
    SESSION_SECRET: "test-secret",
    EMAIL_MODE: "demo",
    RESEND_API_KEY: undefined,
    RESEND_FROM_EMAIL: "Axora <onboarding@resend.dev>",
    SUPPORT_EMAIL: "sales@axora.app",
    SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    SUPABASE_STORAGE_BUCKET: "site-assets",
    VERCEL_API_TOKEN: undefined,
    VERCEL_PROJECT_ID: undefined,
    VERCEL_TEAM_ID: undefined,
    VERCEL_TEAM_SLUG: undefined,
    ...overrides,
  };

  const repository = new Repository(pool);
  const emailService = new EmailService(config);
  const service = new BookingService(repository, emailService, config, domainProvider);
  const scheduler = new Scheduler(repository, (job) => service.handleJob(job));
  service.attachScheduler(scheduler);
  await service.ensureSeedData();

  if (startScheduler) {
    await scheduler.start();
  }

  const app = createApp(config, service);
  const harness = {
    config,
    app,
    pool,
    repository,
    service,
    scheduler,
    close: async () => {
      await scheduler.stop();
      await pool.end();
    },
  };

  harnesses.push(harness);
  return harness;
}

async function createBusinessViaApi(harness: Harness, input = { name: "Luma Salon", type: "salon" as const }) {
  const response = await request(harness.app).post("/api/businesses").send(input).expect(201);
  return response.body as BusinessCreateResult;
}

async function loginAsBusiness(harness: Harness, business: BusinessCreateResult) {
  const response = await request(harness.app)
    .post(`/api/admin/${business.business.slug}/login`)
    .send({ passcode: business.generatedPasscode })
    .expect(200);

  return response.body.token as string;
}

async function waitFor(condition: () => Promise<boolean>, timeoutMs = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out while waiting for condition.");
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map((harness) => harness.close()));
});

describe("axora white-label website generator", () => {
  test("creates a business, provisions a site, and exposes the preview URL", async () => {
    const harness = await createHarness();
    const result = await createBusinessViaApi(harness, { name: "North Star Gym", type: "gym" });

    expect(result.business.slug).toBe("north-star-gym");
    expect(result.generatedPasscode).toMatch(/^GYM-/);
    expect(result.previewSiteUrl).toContain("/preview/north-star-gym");
    expect(result.bookingLink).toContain("/book");
    expect(result.themeKey).toBe("gym-performance");

    const token = await loginAsBusiness(harness, result);
    const siteResponse = await request(harness.app)
      .get(`/api/admin/${result.business.slug}/site`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(siteResponse.body.site.templateKey).toBe("gym-performance");
    expect(siteResponse.body.preview.previewUrl).toContain("/preview/north-star-gym");
    expect(siteResponse.body.domains[0].kind).toBe("preview");
  });

  test("captures leads, converts them into bookings, and reports impact metrics", async () => {
    const harness = await createHarness();
    const business = await createBusinessViaApi(harness);
    const token = await loginAsBusiness(harness, business);

    await request(harness.app)
      .post(`/api/leads/${business.business.slug}`)
      .send({
        name: "Rhea Menon",
        email: "rhea@example.com",
        phone: "+91 90000 11111",
      })
      .expect(201);

    const bookingPayload: BookingInput = {
      name: "Rhea Menon",
      email: "rhea@example.com",
      phone: "+91 90000 11111",
      service: "haircut",
      scheduledAt: new Date().toISOString(),
    };

    const bookingResponse = await request(harness.app)
      .post(`/api/bookings/${business.business.slug}`)
      .send(bookingPayload)
      .expect(201);
    expect(bookingResponse.body.booking.source).toBe("lead");

    const dashboardResponse = await request(harness.app)
      .get(`/api/admin/${business.business.slug}/dashboard`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const dashboard = dashboardResponse.body as DashboardPayload;

    expect(dashboard.leadSummary.totalLeads).toBe(1);
    expect(dashboard.leadSummary.convertedLeads).toBe(1);
    expect(dashboard.impact.conversionRate).toBe(1);
    expect(dashboard.impact.conversionRateLabel).toBe("100%");
    expect(dashboard.impact.bookingsToday).toBe(1);
    expect(dashboard.impact.noShows).toBe(0);
  });

  test("business-scoped bearer tokens cannot access another business dashboard", async () => {
    const harness = await createHarness();
    const first = await createBusinessViaApi(harness, { name: "Luma Salon", type: "salon" });
    const second = await createBusinessViaApi(harness, { name: "Peak Form Gym", type: "gym" });
    const firstToken = await loginAsBusiness(harness, first);

    const secondBooking: BookingInput = {
      name: "Arjun Rao",
      email: "arjun@example.com",
      phone: "+91 93333 44444",
      service: "trial session",
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
    const secondBookingResponse = await request(harness.app)
      .post(`/api/bookings/${second.business.slug}`)
      .send(secondBooking)
      .expect(201);

    await request(harness.app)
      .get(`/api/admin/${first.business.slug}/dashboard`)
      .set("Authorization", `Bearer ${firstToken}`)
      .expect(200);

    await request(harness.app)
      .get(`/api/admin/${second.business.slug}/dashboard`)
      .set("Authorization", `Bearer ${firstToken}`)
      .expect(401);

    await request(harness.app)
      .patch(`/api/admin/${second.business.slug}/bookings/${secondBookingResponse.body.booking.id}/status`)
      .set("Authorization", `Bearer ${firstToken}`)
      .send({ status: "completed" })
      .expect(401);
  });

  test("booking creation stores confirmation activity and a reminder job with business scope", async () => {
    const harness = await createHarness();
    const business = await createBusinessViaApi(harness);

    const bookingPayload: BookingInput = {
      name: "Mira Kapoor",
      email: "mira@example.com",
      phone: "+91 92222 33333",
      service: "facial",
      scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };

    const response = await request(harness.app)
      .post(`/api/bookings/${business.business.slug}`)
      .send(bookingPayload)
      .expect(201);

    const jobs = await harness.repository.listJobs();
    const reminderJob = jobs.find((job) => job.booking_id === response.body.booking.id && job.type === "reminder" && job.status === "pending");
    expect(reminderJob?.business_id).toBe(business.business.id);

    const activity = await harness.repository.listActivityByBusiness(business.business.id);
    const confirmation = activity.find((entry) => entry.bookingId === response.body.booking.id && entry.kind === "confirmation");
    expect(confirmation?.status).toBe("sent");
  });

  test("publishes site edits, resolves preview/custom domains, and completes follow-up automation", async () => {
    const harness = await createHarness({}, true);
    const business = await createBusinessViaApi(harness, { name: "Peak Form Gym", type: "gym" });
    const token = await loginAsBusiness(harness, business);

    const siteBefore = await request(harness.app)
      .get(`/api/admin/${business.business.slug}/site`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const updatedDraft = {
      ...siteBefore.body.site.draft,
      brand: {
        ...siteBefore.body.site.draft.brand,
        displayName: "Peak Form Club",
      },
    };

    await request(harness.app)
      .patch(`/api/admin/${business.business.slug}/site`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateKey: updatedDraft.templateKey,
        theme: updatedDraft.theme,
        seo: updatedDraft.seo,
        brand: updatedDraft.brand,
        contact: updatedDraft.contact,
        booking: updatedDraft.booking,
        pages: updatedDraft.pages,
        sections: updatedDraft.sections,
      })
      .expect(200);

    await request(harness.app)
      .post(`/api/admin/${business.business.slug}/site/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const resolvePreview = await request(harness.app)
      .get(`/api/sites/resolve?slug=${business.business.slug}&state=published`)
      .expect(200);
    expect(resolvePreview.body.site.brand.displayName).toBe("Peak Form Club");

    const customDomain = await request(harness.app)
      .post(`/api/admin/${business.business.slug}/domains`)
      .set("Authorization", `Bearer ${token}`)
      .send({ hostname: "www.peakformclub.com" })
      .expect(201);

    await request(harness.app)
      .post(`/api/admin/${business.business.slug}/domains/verify`)
      .set("Authorization", `Bearer ${token}`)
      .send({ domainId: customDomain.body.domain.id })
      .expect(200);

    const resolveCustom = await request(harness.app)
      .get("/api/sites/resolve?host=www.peakformclub.com")
      .expect(200);
    expect(resolveCustom.body.domain.hostname).toBe("www.peakformclub.com");

    const customSettings = {
      ...business.business.settings,
      followUpHours: 0,
      reengagementDays: 0,
    };
    await harness.pool.query("update businesses set settings_json = $2::jsonb where id = $1", [
      business.business.id,
      JSON.stringify(customSettings),
    ]);

    const bookingPayload: BookingInput = {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "+91 94444 55555",
      service: "trial session",
      scheduledAt: new Date().toISOString(),
    };
    const bookingResponse = await request(harness.app)
      .post(`/api/bookings/${business.business.slug}`)
      .send(bookingPayload)
      .expect(201);

    await request(harness.app)
      .patch(`/api/admin/${business.business.slug}/bookings/${bookingResponse.body.booking.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" })
      .expect(200);

    await waitFor(async () => {
      const activity = await harness.repository.listActivityByBusiness(business.business.id);
      return activity.some((entry) => entry.bookingId === bookingResponse.body.booking.id && entry.kind === "follow_up")
        && activity.some((entry) => entry.bookingId === bookingResponse.body.booking.id && entry.kind === "reengagement");
    }, 1500);
  });
});
