import type { Metadata } from "next";
import { fetchResolvedSiteBySlug } from "../../../lib/api";
import { SiteRenderer } from "../../../components/SiteRenderer";

type PreviewPageProps = {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ state?: "draft" | "published"; page?: string }>;
};

export async function generateMetadata({ params, searchParams }: PreviewPageProps): Promise<Metadata> {
  const { businessSlug } = await params;
  const { state = "draft" } = await searchParams;
  const website = await fetchResolvedSiteBySlug(businessSlug, state);
  return {
    title: `${website.site.seo.siteTitle} Preview`,
    description: website.site.seo.siteDescription,
  };
}

export default async function PreviewPage({ params, searchParams }: PreviewPageProps) {
  const { businessSlug } = await params;
  const { state = "draft", page } = await searchParams;
  const website = await fetchResolvedSiteBySlug(businessSlug, state);
  return <SiteRenderer website={website} currentPage={page ?? "home"} routeMode={page === "book" ? "booking" : "page"} />;
}
