import type { PageKey, PreviewState } from "@business-automation/shared";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function isLocalhostUrl(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

export function getPublicWebsiteOrigin() {
  const configured = import.meta.env.VITE_WEBSITE_URL;
  if (configured && !isLocalhostUrl(configured)) {
    return configured.replace(/\/$/, "");
  }
  return window.location.origin.replace(/\/$/, "");
}

export function getShellAdminOrigin() {
  return window.location.origin.replace(/\/$/, "");
}

export function buildPublicPreviewBaseUrl(businessSlug: string) {
  return `${getPublicWebsiteOrigin()}/preview/${businessSlug}`;
}

export function buildPublicBookingUrl(businessSlug: string) {
  return `${buildPublicPreviewBaseUrl(businessSlug)}/book`;
}

export function buildAdminUrl(businessSlug: string) {
  return `${getShellAdminOrigin()}/admin/${businessSlug}`;
}

export function normalizePreviewBaseUrl(rawUrl: string, businessSlug: string) {
  return !rawUrl || isLocalhostUrl(rawUrl) ? buildPublicPreviewBaseUrl(businessSlug) : rawUrl;
}

export function normalizeBookingUrl(rawUrl: string, businessSlug: string) {
  return !rawUrl || isLocalhostUrl(rawUrl) ? buildPublicBookingUrl(businessSlug) : rawUrl;
}

export function normalizeAdminUrl(rawUrl: string, businessSlug: string) {
  return !rawUrl || isLocalhostUrl(rawUrl) ? buildAdminUrl(businessSlug) : rawUrl;
}

export function buildPreviewUrl(baseUrl: string, page: PageKey, state: PreviewState) {
  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set("state", state);
  url.searchParams.set("page", page);
  return url.toString();
}

export function previewHref(routeBase: string, pageSlug?: string | null) {
  if (!pageSlug || pageSlug === "home") {
    return routeBase;
  }
  if (pageSlug === "book") {
    return `${routeBase}/book`;
  }
  return `${routeBase}/${pageSlug}`;
}

export function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file."));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
