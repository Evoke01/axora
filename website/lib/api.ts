import type { PreviewState, ResolvedWebsite } from "@business-automation/shared";

const API_ORIGIN = process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string) {
  const response = await fetch(`${API_ORIGIN}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchResolvedSiteBySlug(slug: string, state: PreviewState) {
  const search = new URLSearchParams({ slug, state });
  return request<ResolvedWebsite>(`/api/sites/resolve?${search.toString()}`);
}

export function fetchResolvedSiteByHost(host: string) {
  const search = new URLSearchParams({ host, state: "published" });
  return request<ResolvedWebsite>(`/api/sites/resolve?${search.toString()}`);
}

export function siteApiOrigin() {
  return API_ORIGIN;
}
