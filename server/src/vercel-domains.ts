import type { WebsiteDomain } from "@business-automation/shared";
import type { AppConfig } from "./config.js";

type DomainVerificationRecord = {
  type?: string;
  domain?: string;
  value?: string;
  reason?: string;
};

type ProjectDomainPayload = {
  name?: string;
  verified?: boolean;
  verification?: DomainVerificationRecord[];
};

type DomainProvisionResult = Pick<WebsiteDomain, "status" | "verification">;

type HttpError = Error & { statusCode?: number };

function createHttpError(statusCode: number, message: string) {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function normalizeHost(hostname: string) {
  return hostname.trim().toLowerCase();
}

function buildInstructions(record: DomainVerificationRecord | null, fallbackHost: string, fallbackValue: string) {
  const target = record?.domain || fallbackHost;
  const value = record?.value || fallbackValue;
  const rawType = record?.type?.toUpperCase();
  const type = rawType === "TXT" || rawType === "CNAME" ? rawType : "CNAME";

  const firstStep =
    type === "TXT"
      ? `Create a TXT record for ${target} with value ${value}.`
      : `Create a CNAME record for ${target} pointing to ${value}.`;

  const secondStep = record?.reason
    ? `Vercel verification note: ${record.reason}`
    : "Wait for DNS to propagate, then verify the domain again from the admin panel.";

  return {
    cnameName: target,
    cnameValue: value,
    instructions: [firstStep, secondStep],
    verificationToken: type === "TXT" ? value : null,
  };
}

function mapProjectDomain(hostname: string, fallbackValue: string, payload: ProjectDomainPayload): DomainProvisionResult {
  if (payload.verified) {
    return {
      status: "active",
      verification: {
        cnameName: hostname,
        cnameValue: fallbackValue,
        instructions: ["Domain connected to the Vercel website project."],
        verificationToken: null,
      },
    };
  }

  const record = payload.verification?.[0] ?? null;
  return {
    status: "pending_verification",
    verification: buildInstructions(record, hostname, fallbackValue),
  };
}

export type WebsiteDomainProvider = {
  createDomain(hostname: string): Promise<DomainProvisionResult>;
  verifyDomain(hostname: string): Promise<DomainProvisionResult>;
  removeDomain(hostname: string): Promise<void>;
};

export class VercelDomainProvider implements WebsiteDomainProvider {
  private readonly apiToken: string;
  private readonly projectId: string;
  private readonly teamId?: string;
  private readonly teamSlug?: string;
  private readonly fallbackValue: string;

  constructor(config: AppConfig) {
    if (!config.VERCEL_API_TOKEN || !config.VERCEL_PROJECT_ID) {
      throw createHttpError(500, "Vercel domain provider requires API token and project ID.");
    }

    this.apiToken = config.VERCEL_API_TOKEN;
    this.projectId = config.VERCEL_PROJECT_ID;
    this.teamId = config.VERCEL_TEAM_ID;
    this.teamSlug = config.VERCEL_TEAM_SLUG;
    this.fallbackValue = config.PLATFORM_ROOT_DOMAIN;
  }

  static isConfigured(config: AppConfig) {
    return Boolean(config.VERCEL_API_TOKEN && config.VERCEL_PROJECT_ID);
  }

  async createDomain(hostname: string): Promise<DomainProvisionResult> {
    const normalized = normalizeHost(hostname);

    try {
      const payload = await this.request<ProjectDomainPayload>(
        `/v10/projects/${this.projectId}/domains`,
        {
          method: "POST",
          body: JSON.stringify({ name: normalized }),
        },
      );
      return mapProjectDomain(normalized, this.fallbackValue, payload);
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;

      if (statusCode === 400 || statusCode === 409) {
        const current = await this.getDomain(normalized);
        if (current) {
          return mapProjectDomain(normalized, this.fallbackValue, current);
        }
      }
      throw error;
    }
  }

  async verifyDomain(hostname: string): Promise<DomainProvisionResult> {
    const normalized = normalizeHost(hostname);
    const payload = await this.request<ProjectDomainPayload>(
      `/v9/projects/${this.projectId}/domains/${encodeURIComponent(normalized)}/verify`,
      {
        method: "POST",
      },
    );

    const latest = (await this.getDomain(normalized)) ?? payload;
    return mapProjectDomain(normalized, this.fallbackValue, latest);
  }

  async removeDomain(hostname: string) {
    const normalized = normalizeHost(hostname);

    try {
      await this.request<void>(`/v9/projects/${this.projectId}/domains/${encodeURIComponent(normalized)}`, {
        method: "DELETE",
      });
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;

      if (statusCode === 404) {
        return;
      }
      throw error;
    }
  }

  private async getDomain(hostname: string) {
    try {
      return await this.request<ProjectDomainPayload>(
        `/v9/projects/${this.projectId}/domains/${encodeURIComponent(hostname)}`,
        {
          method: "GET",
        },
      );
    } catch (error) {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;

      if (statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private async request<T>(path: string, init: RequestInit) {
    const url = new URL(`https://api.vercel.com${path}`);
    if (this.teamId) {
      url.searchParams.set("teamId", this.teamId);
    }
    if (this.teamSlug) {
      url.searchParams.set("slug", this.teamSlug);
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const payload = await response.text();
      throw createHttpError(response.status, `Vercel domain API failed: ${payload || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
