import {
  bookingSchema,
  bookingStatusSchema,
  businessCreateInputSchema,
  businessCreateResultSchema,
  dashboardSchema,
  leadInputSchema,
  leadSchema,
  publicConfigSchema,
  resolvedWebsiteSchema,
  siteEditorPayloadSchema,
  websiteAssetUploadResultSchema,
  websiteConfigSchema,
  websiteDomainSchema,
} from "@business-automation/shared";
import cors from "cors";
import { createHmac } from "node:crypto";
import express from "express";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import type { BookingService } from "./service.js";

function signToken(slug: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(slug).digest("hex");
  return Buffer.from(`${slug}:${sig}`).toString("base64url");
}

function verifyToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const idx = decoded.indexOf(":");
    if (idx < 1) {
      return null;
    }
    const slug = decoded.slice(0, idx);
    const sig = decoded.slice(idx + 1);
    const expected = createHmac("sha256", secret).update(slug).digest("hex");
    return sig === expected ? slug : null;
  } catch {
    return null;
  }
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestOrigin(req: express.Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim() : req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    typeof forwardedHost === "string"
      ? forwardedHost.split(",")[0]?.trim()
      : typeof req.headers.host === "string"
        ? req.headers.host
        : null;

  if (!proto || !host) {
    return undefined;
  }

  return `${proto}://${host}`;
}

function isLocalOrigin(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function appendVercelScope(url: URL, config: AppConfig) {
  if (config.VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", config.VERCEL_TEAM_ID);
  }
  if (config.VERCEL_TEAM_SLUG) {
    url.searchParams.set("slug", config.VERCEL_TEAM_SLUG);
  }
  return url;
}

function createWebsiteOriginResolver(config: AppConfig) {
  let cachedOrigin: string | null = null;
  let pendingOrigin: Promise<string> | null = null;

  async function fetchFromVercel() {
    if (!config.VERCEL_API_TOKEN || !config.VERCEL_PROJECT_ID) {
      return null;
    }

    const url = appendVercelScope(new URL(`https://api.vercel.com/v9/projects/${config.VERCEL_PROJECT_ID}/domains`), config);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.VERCEL_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      domains?: Array<{ name?: string; verified?: boolean }>;
    };

    const verified = payload.domains?.find((domain) => domain.verified && domain.name);
    return verified?.name ? `https://${verified.name}` : null;
  }

  return async function resolveWebsiteOrigin() {
    if (cachedOrigin) {
      return cachedOrigin;
    }

    if (!isLocalOrigin(config.WEBSITE_ORIGIN)) {
      cachedOrigin = config.WEBSITE_ORIGIN;
      return cachedOrigin;
    }

    if (config.NODE_ENV === "production" && config.PLATFORM_ROOT_DOMAIN && !isLocalOrigin(config.PLATFORM_ROOT_DOMAIN)) {
      cachedOrigin = `https://${config.PLATFORM_ROOT_DOMAIN}`;
      return cachedOrigin;
    }

    if (!pendingOrigin) {
      pendingOrigin = fetchFromVercel()
        .then((origin) => {
          cachedOrigin = origin ?? config.WEBSITE_ORIGIN;
          return cachedOrigin;
        })
        .finally(() => {
          pendingOrigin = null;
        });
    }

    return pendingOrigin;
  };
}

function createRequireAdmin(secret: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const businessSlug = getParam(req.params.businessSlug);
    const authHeader = req.headers.authorization;
    if (businessSlug && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const slug = verifyToken(token, secret);
      if (slug && slug === businessSlug) {
        next();
        return;
      }
    }
    res.status(401).json({ error: "Admin session required." });
  };
}

function handleError(error: unknown, res: express.Response) {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Validation failed.", issues: error.flatten() });
    return;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  res.status(statusCode).json({ error: message });
}

export function createApp(config: AppConfig, bookingService: BookingService) {
  const app = express();
  const requireAdmin = createRequireAdmin(config.SESSION_SECRET);
  const resolveWebsiteOrigin = createWebsiteOriginResolver(config);

  app.use(cors({ origin: [config.CLIENT_ORIGIN, config.WEBSITE_ORIGIN], credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, app: "axora", emailMode: config.EMAIL_MODE });
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      const input = businessCreateInputSchema.parse(req.body);
      const websiteOrigin = await resolveWebsiteOrigin();
      const result = await bookingService.createBusiness(input, {
        requestOrigin: getRequestOrigin(req),
        clientOrigin: getRequestOrigin(req),
        websiteOrigin,
      });
      res.status(201).json(businessCreateResultSchema.parse(result));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/public-config/:businessSlug", async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const websiteOrigin = await resolveWebsiteOrigin();
      const payload = await bookingService.getPublicConfig(businessSlug ?? "", {
        requestOrigin: getRequestOrigin(req),
        clientOrigin: getRequestOrigin(req),
        websiteOrigin,
      });
      res.json(publicConfigSchema.parse(payload));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/sites/resolve", async (req, res) => {
    try {
      const host = typeof req.query.host === "string" ? req.query.host : undefined;
      const slug = typeof req.query.slug === "string" ? req.query.slug : undefined;
      const state = req.query.state === "draft" ? "draft" : "published";
      const payload = await bookingService.resolveSite({ host, slug, state });
      res.json(resolvedWebsiteSchema.parse(payload));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/leads/:businessSlug", async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const input = leadInputSchema.parse(req.body);
      const lead = await bookingService.createLead(businessSlug ?? "", input);
      res.status(201).json({ lead: leadSchema.parse(lead) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/bookings/:businessSlug", async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const booking = await bookingService.createBooking(businessSlug ?? "", req.body);
      res.status(201).json({ booking: bookingSchema.parse(booking) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/login", async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const authenticatedSlug = await bookingService.loginBusinessAdmin(businessSlug ?? "", req.body?.passcode ?? "");
      const token = signToken(authenticatedSlug, config.SESSION_SECRET);
      res.json({ ok: true, token });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/logout", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/admin/:businessSlug/dashboard", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const websiteOrigin = await resolveWebsiteOrigin();
      const dashboard = await bookingService.getDashboard(businessSlug ?? "", {
        requestOrigin: getRequestOrigin(req),
        clientOrigin: getRequestOrigin(req),
        websiteOrigin,
      });
      res.json(dashboardSchema.parse(dashboard));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.get("/api/admin/:businessSlug/site", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const websiteOrigin = await resolveWebsiteOrigin();
      const site = await bookingService.getSiteEditor(businessSlug ?? "", {
        requestOrigin: getRequestOrigin(req),
        clientOrigin: getRequestOrigin(req),
        websiteOrigin,
      });
      res.json(siteEditorPayloadSchema.parse(site));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.patch("/api/admin/:businessSlug/site", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const site = await bookingService.updateSite(businessSlug ?? "", req.body);
      res.json({ site: websiteConfigSchema.parse(site) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/site/publish", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const site = await bookingService.publishSite(businessSlug ?? "");
      res.json({ site: websiteConfigSchema.parse(site) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/site/assets", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const asset = await bookingService.uploadSiteAsset(businessSlug ?? "", req.body);
      res.status(201).json(websiteAssetUploadResultSchema.parse(asset));
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/domains", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const domain = await bookingService.addDomain(businessSlug ?? "", req.body);
      res.status(201).json({ domain: websiteDomainSchema.parse(domain) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.post("/api/admin/:businessSlug/domains/verify", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const domain = await bookingService.verifyDomain(businessSlug ?? "", req.body);
      res.json({ domain: websiteDomainSchema.parse(domain) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.delete("/api/admin/:businessSlug/domains/:domainId", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const domainId = getParam(req.params.domainId);
      const deleted = await bookingService.deleteDomain(businessSlug ?? "", domainId ?? "");
      res.json({ ok: deleted });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.patch("/api/admin/:businessSlug/bookings/:bookingId/status", requireAdmin, async (req, res) => {
    try {
      const businessSlug = getParam(req.params.businessSlug);
      const bookingId = getParam(req.params.bookingId);
      const status = bookingStatusSchema.parse(req.body.status);
      const booking = await bookingService.updateStatus(businessSlug ?? "", bookingId ?? "", status);
      if (!booking) {
        res.status(404).json({ error: "Booking not found." });
        return;
      }
      res.json({ booking: bookingSchema.parse(booking) });
    } catch (error) {
      handleError(error, res);
    }
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    handleError(error, res);
  });

  return app;
}
