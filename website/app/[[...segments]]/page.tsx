import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SiteRenderer } from "../../components/SiteRenderer";
import { fetchResolvedSiteByHost } from "../../lib/api";

type HostPageProps = {
  params: Promise<{ segments?: string[] }>;
};

async function getWebsite(host: string) {
  try {
    return await fetchResolvedSiteByHost(host);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: HostPageProps): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const website = await getWebsite(host);
  if (!website) {
    return { title: "Website not found" };
  }
  const { segments } = await params;
  const currentPage = segments?.[0] ?? "home";
  const page = website.site.pages.find((item) => item.slug === currentPage || item.key === currentPage) ?? website.site.pages[0];

  return {
    title: page ? `${page.label} | ${website.site.seo.siteTitle}` : website.site.seo.siteTitle,
    description: website.site.seo.siteDescription,
    openGraph: {
      title: website.site.seo.siteTitle,
      description: website.site.seo.siteDescription,
      images: website.site.seo.ogImage ? [website.site.seo.ogImage] : [],
    },
    robots: website.site.seo.indexable ? undefined : { index: false, follow: false },
  };
}

export default async function HostPage({ params }: HostPageProps) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const website = await getWebsite(host);
  if (!website) {
    notFound();
  }

  const { segments } = await params;
  const currentPage = segments?.[0] ?? "home";
  const routeMode = currentPage === "book" ? "booking" : "page";

  return <SiteRenderer website={website} currentPage={currentPage} routeMode={routeMode} />;
}
