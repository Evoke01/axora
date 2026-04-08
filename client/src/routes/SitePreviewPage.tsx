import type { PreviewState } from "@business-automation/shared";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchResolvedSiteBySlug } from "../api";
import { SiteRenderer } from "../components/site/SiteRenderer";

export function SitePreviewPage() {
  const { businessSlug, "*": wildcard } = useParams();
  const [searchParams] = useSearchParams();
  const [website, setWebsite] = useState<Awaited<ReturnType<typeof fetchResolvedSiteBySlug>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state = (searchParams.get("state") === "draft" ? "draft" : "published") as PreviewState;
  const pageParam = searchParams.get("page");
  const wildcardPage = wildcard?.split("/")[0] ?? null;
  const currentPage = wildcardPage ?? pageParam ?? "home";
  const routeMode = currentPage === "book" ? "booking" : "page";

  useEffect(() => {
    if (!businessSlug) {
      return;
    }

    setError(null);
    fetchResolvedSiteBySlug(businessSlug, state)
      .then(setWebsite)
      .catch((issue) => {
        setError(issue instanceof Error ? issue.message : "Could not load website.");
      });
  }, [businessSlug, state]);

  if (error) {
    return (
      <main className="page-shell">
        <section className="page-header">
          <p className="eyebrow">Preview unavailable</p>
          <h1>Could not load this business website.</h1>
          <p className="page-lede">{error}</p>
        </section>
      </main>
    );
  }

  if (!website) {
    return (
      <main className="page-shell">
        <section className="page-header">
          <p className="eyebrow">Loading preview</p>
          <h1>Preparing the customer website.</h1>
        </section>
      </main>
    );
  }

  return <SiteRenderer website={website} currentPage={currentPage} routeMode={routeMode} />;
}
