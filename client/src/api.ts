import type {
  Booking,
  BookingInput,
  BookingStatus,
  BusinessCreateInput,
  BusinessCreateResult,
  DashboardPayload,
  Lead,
  LeadInput,
  PublicConfig,
  SiteEditorPayload,
  WebsiteAssetUploadInput,
  WebsiteAssetUploadResult,
  WebsiteConfig,
  WebsiteDomain,
  WebsitePatch,
} from "@business-automation/shared";

const API = import.meta.env.VITE_API_URL ?? "";

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

type JsonOptions = RequestInit & {
  jsonBody?: unknown;
};

async function requestJson<T>(path: string, options: JsonOptions = {}): Promise<T> {
  const { jsonBody, ...requestOptions } = options;
  const response = await fetch(`${API}${path}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(requestOptions.headers ?? {}),
    },
    body: jsonBody === undefined ? requestOptions.body : JSON.stringify(jsonBody),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          issues?: {
            fieldErrors?: Record<string, string[]>;
            formErrors?: string[];
          };
        }
      | null;

    if (payload?.issues) {
      const parts: string[] = [];
      if (payload.issues.formErrors?.length) {
        parts.push(...payload.issues.formErrors);
      }
      if (payload.issues.fieldErrors) {
        Object.entries(payload.issues.fieldErrors).forEach(([field, errors]) => {
          if (errors?.length) {
            parts.push(`${field}: ${errors.join(", ")}`);
          }
        });
      }
      if (parts.length > 0) {
        throw new Error(`Validation failed: ${parts.join("; ")}`);
      }
    }

    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function createBusiness(input: BusinessCreateInput) {
  return requestJson<BusinessCreateResult>("/api/businesses", {
    method: "POST",
    jsonBody: input,
  });
}

export function fetchPublicConfig(businessSlug: string) {
  return requestJson<PublicConfig>(`/api/public-config/${businessSlug}`);
}

export function createLead(businessSlug: string, input: LeadInput) {
  return requestJson<{ lead: Lead }>(`/api/leads/${businessSlug}`, {
    method: "POST",
    jsonBody: input,
  });
}

export function createBooking(businessSlug: string, input: BookingInput) {
  return requestJson<{ booking: Booking }>(`/api/bookings/${businessSlug}`, {
    method: "POST",
    jsonBody: input,
  });
}

export async function login(businessSlug: string, passcode: string) {
  const result = await requestJson<{ ok: true; token: string }>(`/api/admin/${businessSlug}/login`, {
    method: "POST",
    jsonBody: { passcode },
  });
  setAuthToken(result.token);
  return result;
}

export async function logout(businessSlug: string) {
  setAuthToken(null);
  return requestJson<{ ok: true }>(`/api/admin/${businessSlug}/logout`, {
    method: "POST",
  });
}

export function fetchDashboard(businessSlug: string) {
  return requestJson<DashboardPayload>(`/api/admin/${businessSlug}/dashboard`);
}

export function updateBookingStatus(businessSlug: string, id: string, status: BookingStatus) {
  return requestJson<{ booking: Booking }>(`/api/admin/${businessSlug}/bookings/${id}/status`, {
    method: "PATCH",
    jsonBody: { status },
  });
}

export function fetchSiteEditor(businessSlug: string) {
  return requestJson<SiteEditorPayload>(`/api/admin/${businessSlug}/site`);
}

export function updateSiteEditor(businessSlug: string, patch: WebsitePatch) {
  return requestJson<{ site: WebsiteConfig }>(`/api/admin/${businessSlug}/site`, {
    method: "PATCH",
    jsonBody: patch,
  });
}

export function publishSiteEditor(businessSlug: string) {
  return requestJson<{ site: WebsiteConfig }>(`/api/admin/${businessSlug}/site/publish`, {
    method: "POST",
  });
}

export function uploadSiteAsset(businessSlug: string, input: WebsiteAssetUploadInput) {
  return requestJson<WebsiteAssetUploadResult>(`/api/admin/${businessSlug}/site/assets`, {
    method: "POST",
    jsonBody: input,
  });
}

export function addSiteDomain(businessSlug: string, hostname: string) {
  return requestJson<{ domain: WebsiteDomain }>(`/api/admin/${businessSlug}/domains`, {
    method: "POST",
    jsonBody: { hostname },
  });
}

export function verifySiteDomain(businessSlug: string, domainId: string) {
  return requestJson<{ domain: WebsiteDomain }>(`/api/admin/${businessSlug}/domains/verify`, {
    method: "POST",
    jsonBody: { domainId },
  });
}

export function deleteSiteDomain(businessSlug: string, domainId: string) {
  return requestJson<{ ok: boolean }>(`/api/admin/${businessSlug}/domains/${domainId}`, {
    method: "DELETE",
  });
}
