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
} from "@business-automation/shared";

const API = import.meta.env.VITE_API_URL ?? "";

type JsonOptions = RequestInit & {
  jsonBody?: unknown;
};

async function requestJson<T>(path: string, options: JsonOptions = {}): Promise<T> {
  const { jsonBody, ...requestOptions } = options;
  
  // Apply the API prefix here
  const response = await fetch(`${API}${path}`, {
    ...requestOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(requestOptions.headers ?? {}),
    },
    body: jsonBody === undefined ? requestOptions.body : JSON.stringify(jsonBody),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { 
      error?: string;
      issues?: { 
        fieldErrors?: Record<string, string[]>;
        formErrors?: string[];
      } 
    } | null;

    if (payload?.issues) {
      const parts: string[] = [];
      if (payload.issues.formErrors?.length) {
        parts.push(...payload.issues.formErrors);
      }
      if (payload.issues.fieldErrors) {
        Object.entries(payload.issues.fieldErrors).forEach(([field, errs]) => {
          if (errs && errs.length) {
            parts.push(`${field}: ${errs.join(', ')}`);
          }
        });
      }
      if (parts.length > 0) {
        throw new Error(`Validation failed: ${parts.join('; ')}`);
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

export function login(businessSlug: string, passcode: string) {
  return requestJson<{ ok: true }>(`/api/admin/${businessSlug}/login`, {
    method: "POST",
    jsonBody: { passcode },
  });
}

export function logout(businessSlug: string) {
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
