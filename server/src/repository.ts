import {
  planCatalog,
  type Booking,
  type BookingSource,
  type BookingStatus,
  type Business,
  type BusinessSettings,
  type BusinessType,
  type EmailMode,
  type JobType,
  type Lead,
  type LeadSource,
  type MessageKind,
  type MessageLog,
  type PlanTier,
  type ThemePreset,
  type WebsiteConfig,
  type WebsiteDomain,
  type WebsiteDraft,
  type WebsiteSeo,
  type WebsiteTheme,
} from "@business-automation/shared";
import { randomUUID } from "node:crypto";
import type { DatabaseClient } from "./db.js";

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  type: BusinessType;
  admin_passcode_hash: string;
  support_email: string;
  current_plan: PlanTier;
  settings_json: BusinessSettings | string;
  created_at: Date;
  updated_at: Date;
};

type LeadRow = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  status: "new" | "converted";
  source: LeadSource;
  converted_booking_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type BookingRow = {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  scheduled_at: Date;
  status: BookingStatus;
  source: BookingSource;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PendingJob = {
  id: string;
  business_id: string;
  booking_id: string;
  type: JobType;
  run_at: Date;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  attempts: number;
  payload_json: Record<string, unknown>;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  business_id: string;
  booking_id: string;
  kind: MessageKind;
  delivery_mode: EmailMode;
  status: "sent" | "failed" | "skipped";
  subject: string;
  to_email: string;
  sent_at: Date | null;
  provider_message_id: string | null;
  error: string | null;
  created_at: Date;
};

type WebsiteConfigRow = {
  id: string;
  business_id: string;
  template_key: ThemePreset;
  draft_json: WebsiteDraft | string;
  published_json: WebsiteDraft | string;
  theme_json: WebsiteTheme | string;
  seo_json: WebsiteSeo | string;
  publish_version: number;
  created_at: Date;
  updated_at: Date;
};

type WebsiteDomainRow = {
  id: string;
  business_id: string;
  hostname: string;
  kind: WebsiteDomain["kind"];
  status: WebsiteDomain["status"];
  verification_json: WebsiteDomain["verification"] | string;
  created_at: Date;
  updated_at: Date;
};

export type DashboardSnapshot = {
  business: Business;
  leads: Lead[];
  bookings: Booking[];
  activity: MessageLog[];
  plans: typeof planCatalog;
};

function parseJson<T>(value: T | string): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value;
}

function mapBusiness(row: BusinessRow): Business {
  const settings = parseJson(row.settings_json);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    currentPlan: row.current_plan,
    supportEmail: row.support_email,
    settings,
    services: settings.services,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapLead(row: LeadRow): Lead {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    source: row.source,
    convertedBookingId: row.converted_booking_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    service: row.service,
    scheduledAt: row.scheduled_at.toISOString(),
    status: row.status,
    source: row.source,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
  };
}

function mapMessage(row: MessageRow): MessageLog {
  return {
    id: row.id,
    businessId: row.business_id,
    bookingId: row.booking_id,
    kind: row.kind,
    deliveryMode: row.delivery_mode,
    status: row.status,
    subject: row.subject,
    toEmail: row.to_email,
    sentAt: row.sent_at ? row.sent_at.toISOString() : null,
    providerMessageId: row.provider_message_id,
    error: row.error,
    createdAt: row.created_at.toISOString(),
  };
}

function mapWebsiteConfig(row: WebsiteConfigRow): WebsiteConfig {
  return {
    id: row.id,
    businessId: row.business_id,
    templateKey: row.template_key,
    theme: parseJson(row.theme_json),
    seo: parseJson(row.seo_json),
    draft: parseJson(row.draft_json),
    published: parseJson(row.published_json),
    publishVersion: row.publish_version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapWebsiteDomain(row: WebsiteDomainRow): WebsiteDomain {
  return {
    id: row.id,
    businessId: row.business_id,
    hostname: row.hostname,
    kind: row.kind,
    status: row.status,
    verification: parseJson(row.verification_json),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class Repository {
  constructor(private readonly db: DatabaseClient) {}

  async insertBusiness(input: {
    name: string;
    slug: string;
    type: BusinessType;
    adminPasscodeHash: string;
    supportEmail: string;
    settings: BusinessSettings;
    currentPlan?: PlanTier;
  }) {
    const result = await this.db.query<BusinessRow>(
      `insert into businesses (id, name, slug, type, admin_passcode_hash, support_email, current_plan, settings_json)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       returning *`,
      [
        randomUUID(),
        input.name,
        input.slug,
        input.type,
        input.adminPasscodeHash,
        input.supportEmail,
        input.currentPlan ?? "starter",
        JSON.stringify(input.settings),
      ],
    );
    return mapBusiness(result.rows[0]);
  }

  async getBusinessBySlug(slug: string) {
    const result = await this.db.query<BusinessRow>("select * from businesses where slug = $1", [slug]);
    return result.rows[0] ? mapBusiness(result.rows[0]) : null;
  }

  async getBusinessById(id: string) {
    const result = await this.db.query<BusinessRow>("select * from businesses where id = $1", [id]);
    return result.rows[0] ? mapBusiness(result.rows[0]) : null;
  }

  async getBusinessAuthBySlug(slug: string) {
    const result = await this.db.query<Pick<BusinessRow, "id" | "slug" | "admin_passcode_hash">>(
      "select id, slug, admin_passcode_hash from businesses where slug = $1",
      [slug],
    );
    return result.rows[0] ?? null;
  }

  async slugExists(slug: string) {
    const result = await this.db.query<{ exists: boolean }>(
      "select exists(select 1 from businesses where slug = $1) as exists",
      [slug],
    );
    return Boolean(result.rows[0]?.exists);
  }

  async insertLead(input: {
    businessId: string;
    name: string;
    email: string;
    phone: string;
    source?: LeadSource;
  }) {
    const result = await this.db.query<LeadRow>(
      `insert into leads (id, business_id, name, email, phone, status, source)
       values ($1, $2, $3, $4, $5, 'new', $6)
       returning *`,
      [randomUUID(), input.businessId, input.name, input.email, input.phone, input.source ?? "public"],
    );
    return mapLead(result.rows[0]);
  }

  async listLeadsByBusiness(businessId: string) {
    const result = await this.db.query<LeadRow>(
      "select * from leads where business_id = $1 order by created_at desc",
      [businessId],
    );
    return result.rows.map(mapLead);
  }

  async findOpenLeadForConversion(businessId: string, email: string, phone: string) {
    const result = await this.db.query<LeadRow>(
      `select * from leads
       where business_id = $1
         and status = 'new'
         and converted_booking_id is null
         and (lower(email) = lower($2) or phone = $3)
       order by created_at desc
       limit 1`,
      [businessId, email, phone],
    );
    return result.rows[0] ? mapLead(result.rows[0]) : null;
  }

  async markLeadConverted(leadId: string, bookingId: string) {
    await this.db.query(
      `update leads
       set status = 'converted',
           converted_booking_id = $2,
           updated_at = now()
       where id = $1`,
      [leadId, bookingId],
    );
  }

  async insertBooking(input: {
    businessId: string;
    name: string;
    email: string;
    phone: string;
    service: string;
    scheduledAt: Date;
    source: BookingSource;
    status?: BookingStatus;
  }) {
    const result = await this.db.query<BookingRow>(
      `insert into bookings (id, business_id, name, email, phone, service, scheduled_at, status, source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        randomUUID(),
        input.businessId,
        input.name,
        input.email,
        input.phone,
        input.service,
        input.scheduledAt,
        input.status ?? "confirmed",
        input.source,
      ],
    );
    return mapBooking(result.rows[0]);
  }

  async updateBookingStatus(businessId: string, id: string, status: BookingStatus) {
    const completedAt = status === "completed" ? new Date() : null;
    const result = await this.db.query<BookingRow>(
      `update bookings
       set status = $3,
           completed_at = case when $3 = 'completed' then coalesce(completed_at, $4) else completed_at end,
           updated_at = now()
       where id = $1 and business_id = $2
       returning *`,
      [id, businessId, status, completedAt],
    );
    return result.rows[0] ? mapBooking(result.rows[0]) : null;
  }

  async getBookingById(id: string) {
    const result = await this.db.query<BookingRow>("select * from bookings where id = $1", [id]);
    return result.rows[0] ? mapBooking(result.rows[0]) : null;
  }

  async listBookingsByBusiness(businessId: string) {
    const result = await this.db.query<BookingRow>(
      "select * from bookings where business_id = $1 order by scheduled_at desc, created_at desc",
      [businessId],
    );
    return result.rows.map(mapBooking);
  }

  async listActivityByBusiness(businessId: string, limit = 20) {
    const result = await this.db.query<MessageRow>(
      `select * from message_log
       where business_id = $1
       order by coalesce(sent_at, created_at) desc, created_at desc
       limit $2`,
      [businessId, limit],
    );
    return result.rows.map(mapMessage);
  }

  async createWebsiteConfig(input: {
    businessId: string;
    templateKey: ThemePreset;
    draft: WebsiteDraft;
    published: WebsiteDraft;
    theme: WebsiteTheme;
    seo: WebsiteSeo;
  }) {
    const result = await this.db.query<WebsiteConfigRow>(
      `insert into website_configs (
         id,
         business_id,
         template_key,
         draft_json,
         published_json,
         theme_json,
         seo_json,
         publish_version
       )
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, 1)
       returning *`,
      [
        randomUUID(),
        input.businessId,
        input.templateKey,
        JSON.stringify(input.draft),
        JSON.stringify(input.published),
        JSON.stringify(input.theme),
        JSON.stringify(input.seo),
      ],
    );
    return mapWebsiteConfig(result.rows[0]);
  }

  async getWebsiteConfigByBusinessId(businessId: string) {
    const result = await this.db.query<WebsiteConfigRow>(
      "select * from website_configs where business_id = $1",
      [businessId],
    );
    return result.rows[0] ? mapWebsiteConfig(result.rows[0]) : null;
  }

  async updateWebsiteDraft(input: {
    businessId: string;
    templateKey: ThemePreset;
    draft: WebsiteDraft;
    theme: WebsiteTheme;
    seo: WebsiteSeo;
  }) {
    const result = await this.db.query<WebsiteConfigRow>(
      `update website_configs
       set template_key = $2,
           draft_json = $3::jsonb,
           theme_json = $4::jsonb,
           seo_json = $5::jsonb,
           updated_at = now()
       where business_id = $1
       returning *`,
      [
        input.businessId,
        input.templateKey,
        JSON.stringify(input.draft),
        JSON.stringify(input.theme),
        JSON.stringify(input.seo),
      ],
    );
    return result.rows[0] ? mapWebsiteConfig(result.rows[0]) : null;
  }

  async publishWebsite(businessId: string) {
    const result = await this.db.query<WebsiteConfigRow>(
      `update website_configs
       set published_json = draft_json,
           publish_version = publish_version + 1,
           updated_at = now()
       where business_id = $1
       returning *`,
      [businessId],
    );
    return result.rows[0] ? mapWebsiteConfig(result.rows[0]) : null;
  }

  async insertWebsiteDomain(input: {
    businessId: string;
    hostname: string;
    kind: WebsiteDomain["kind"];
    status: WebsiteDomain["status"];
    verification: WebsiteDomain["verification"];
  }) {
    const result = await this.db.query<WebsiteDomainRow>(
      `insert into website_domains (id, business_id, hostname, kind, status, verification_json)
       values ($1, $2, lower($3), $4, $5, $6::jsonb)
       returning *`,
      [
        randomUUID(),
        input.businessId,
        input.hostname,
        input.kind,
        input.status,
        JSON.stringify(input.verification),
      ],
    );
    return mapWebsiteDomain(result.rows[0]);
  }

  async listWebsiteDomains(businessId: string) {
    const result = await this.db.query<WebsiteDomainRow>(
      "select * from website_domains where business_id = $1 order by created_at asc",
      [businessId],
    );
    return result.rows.map(mapWebsiteDomain);
  }

  async getWebsiteDomainById(businessId: string, domainId: string) {
    const result = await this.db.query<WebsiteDomainRow>(
      "select * from website_domains where business_id = $1 and id = $2",
      [businessId, domainId],
    );
    return result.rows[0] ? mapWebsiteDomain(result.rows[0]) : null;
  }

  async getWebsiteDomainByHost(hostname: string) {
    const normalized = hostname.trim().toLowerCase();
    const result = await this.db.query<WebsiteDomainRow>(
      "select * from website_domains where lower(hostname) = $1 order by created_at asc limit 1",
      [normalized],
    );
    return result.rows[0] ? mapWebsiteDomain(result.rows[0]) : null;
  }

  async updateWebsiteDomainStatus(
    businessId: string,
    domainId: string,
    status: WebsiteDomain["status"],
    verification: WebsiteDomain["verification"] | null = null,
  ) {
    const result = await this.db.query<WebsiteDomainRow>(
      `update website_domains
       set status = $3,
           verification_json = case when $4::jsonb is null then verification_json else $4::jsonb end,
           updated_at = now()
       where business_id = $1 and id = $2
       returning *`,
      [businessId, domainId, status, verification ? JSON.stringify(verification) : null],
    );
    return result.rows[0] ? mapWebsiteDomain(result.rows[0]) : null;
  }

  async deleteWebsiteDomain(businessId: string, domainId: string) {
    const result = await this.db.query<{ id: string }>(
      "delete from website_domains where business_id = $1 and id = $2 returning id",
      [businessId, domainId],
    );
    return Boolean(result.rows[0]);
  }

  async ensurePendingJob(
    businessId: string,
    bookingId: string,
    type: JobType,
    runAt: Date,
    payload: Record<string, unknown> = {},
  ) {
    const existing = await this.db.query<{ id: string }>(
      "select id from jobs where booking_id = $1 and type = $2 and status in ('pending', 'running') limit 1",
      [bookingId, type],
    );
    if (existing.rows[0]) {
      return false;
    }

    await this.db.query(
      `insert into jobs (id, business_id, booking_id, type, run_at, payload_json)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [randomUUID(), businessId, bookingId, type, runAt, JSON.stringify(payload)],
    );
    return true;
  }

  async getNextPendingJob() {
    const result = await this.db.query<PendingJob>(
      "select * from jobs where status = 'pending' order by run_at asc limit 1",
    );
    return result.rows[0] ?? null;
  }

  async listJobs() {
    const result = await this.db.query<PendingJob>("select * from jobs order by run_at asc, created_at asc");
    return result.rows;
  }

  async claimNextDueJob(now = new Date()) {
    const next = await this.db.query<{ id: string }>(
      "select id from jobs where status = 'pending' and run_at <= $1 order by run_at asc limit 1",
      [now],
    );
    const jobId = next.rows[0]?.id;
    if (!jobId) {
      return null;
    }

    const claimed = await this.db.query<PendingJob>(
      `update jobs
       set status = 'running',
           attempts = attempts + 1,
           updated_at = now()
       where id = $1 and status = 'pending'
       returning *`,
      [jobId],
    );
    return claimed.rows[0] ?? null;
  }

  async finishJob(id: string, status: "completed" | "failed" | "skipped", error: string | null = null) {
    await this.db.query("update jobs set status = $2, last_error = $3, updated_at = now() where id = $1", [
      id,
      status,
      error,
    ]);
  }

  async upsertMessageLog(input: {
    businessId: string;
    bookingId: string;
    kind: MessageKind;
    deliveryMode: EmailMode;
    status: "sent" | "failed" | "skipped";
    subject: string;
    toEmail: string;
    sentAt: Date | null;
    providerMessageId?: string | null;
    error?: string | null;
  }) {
    const result = await this.db.query<MessageRow>(
      `insert into message_log (
         id,
         business_id,
         booking_id,
         kind,
         delivery_mode,
         status,
         subject,
         to_email,
         sent_at,
         provider_message_id,
         error
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (booking_id, kind) do update
         set business_id = excluded.business_id,
             delivery_mode = excluded.delivery_mode,
             status = excluded.status,
             subject = excluded.subject,
             to_email = excluded.to_email,
             sent_at = excluded.sent_at,
             provider_message_id = excluded.provider_message_id,
             error = excluded.error
       returning *`,
      [
        randomUUID(),
        input.businessId,
        input.bookingId,
        input.kind,
        input.deliveryMode,
        input.status,
        input.subject,
        input.toEmail,
        input.sentAt,
        input.providerMessageId ?? null,
        input.error ?? null,
      ],
    );
    return mapMessage(result.rows[0]);
  }

  async getDashboardSnapshot(businessId: string): Promise<DashboardSnapshot | null> {
    const [business, leads, bookings, activity] = await Promise.all([
      this.getBusinessById(businessId),
      this.listLeadsByBusiness(businessId),
      this.listBookingsByBusiness(businessId),
      this.listActivityByBusiness(businessId),
    ]);

    if (!business) {
      return null;
    }

    return {
      business,
      leads,
      bookings,
      activity,
      plans: planCatalog,
    };
  }
}
