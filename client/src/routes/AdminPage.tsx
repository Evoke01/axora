import type {
  BookingStatus,
  PageKey,
  PreviewState,
  SiteEditorPayload,
  ThemePreset,
  WebsiteDraft,
  WebsiteSection,
} from "@business-automation/shared";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  addSiteDomain,
  deleteSiteDomain,
  fetchDashboard,
  fetchSiteEditor,
  login,
  logout,
  publishSiteEditor,
  updateBookingStatus,
  updateSiteEditor,
  uploadSiteAsset,
  verifySiteDomain,
} from "../api";
import { InfoCard } from "../components/InfoCard";
import { MetricCard } from "../components/MetricCard";
import { buildAdminUrl, buildPreviewUrl, buildPublicBookingUrl, buildPublicPreviewBaseUrl, formatDate, toBase64 } from "../lib/site";

function themeDefaultsForPreset(preset: ThemePreset) {
  const defaults = {
    "salon-editorial": { accent: "#d4a373", background: "#111111", surface: "#171717", text: "#f8f5ef" },
    "salon-premium-beauty": { accent: "#9d4edd", background: "#f8f4ff", surface: "#ffffff", text: "#241335" },
    "salon-soft-luxury": { accent: "#b08968", background: "#fcf7f1", surface: "#fffdfb", text: "#35261f" },
    "gym-performance": { accent: "#f97316", background: "#090909", surface: "#101010", text: "#f8fafc" },
    "gym-coaching": { accent: "#14b8a6", background: "#061311", surface: "#0b1b18", text: "#ecfeff" },
    "gym-membership": { accent: "#2563eb", background: "#eef4ff", surface: "#ffffff", text: "#13233e" },
  } satisfies Record<ThemePreset, { accent: string; background: string; surface: string; text: string }>;

  return defaults[preset];
}

export function AdminPage() {
  const { businessSlug } = useParams();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null);
  const [siteEditor, setSiteEditor] = useState<SiteEditorPayload | null>(null);
  const [draft, setDraft] = useState<WebsiteDraft | null>(null);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "website" | "domains">("overview");
  const [previewState, setPreviewState] = useState<PreviewState>("draft");
  const [previewPage, setPreviewPage] = useState<PageKey>("home");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [domainValue, setDomainValue] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const hydratedDraft = useRef(false);

  async function loadAdminData(slug: string) {
    const [dashboardPayload, sitePayload] = await Promise.all([fetchDashboard(slug), fetchSiteEditor(slug)]);
    setDashboard(dashboardPayload);
    setSiteEditor(sitePayload);
    setDraft(sitePayload.site.draft);
    const firstPage = sitePayload.site.draft.pages.find((page) => page.enabled)?.key ?? "home";
    setPreviewPage(firstPage);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessSlug) {
      return;
    }
    setLoading(true);
    setLoginError(null);
    try {
      await login(businessSlug, passcode);
      await loadAdminData(businessSlug);
    } catch (issue) {
      setLoginError(issue instanceof Error ? issue.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (businessSlug) {
      await logout(businessSlug);
    }
    setDashboard(null);
    setSiteEditor(null);
    setDraft(null);
    hydratedDraft.current = false;
  }

  useEffect(() => {
    hydratedDraft.current = false;
  }, [siteEditor?.site.id]);

  useEffect(() => {
    if (!businessSlug || !draft || !siteEditor) {
      return;
    }
    if (!hydratedDraft.current) {
      hydratedDraft.current = true;
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        setSaveError(null);
        const response = await updateSiteEditor(businessSlug, {
          templateKey: draft.templateKey,
          theme: draft.theme,
          seo: draft.seo,
          brand: draft.brand,
          contact: draft.contact,
          booking: draft.booking,
          pages: draft.pages,
          sections: draft.sections,
        });
        setSiteEditor((current) => (current ? { ...current, site: response.site } : current));
        setSaveState("saved");
      } catch (issue) {
        setSaveState("error");
        setSaveError(issue instanceof Error ? issue.message : "Could not save draft.");
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [businessSlug, draft, siteEditor]);

  const previewUrl = useMemo(() => {
    if (!siteEditor) {
      return "";
    }
    const base = buildPublicPreviewBaseUrl(siteEditor.business.slug);
    return buildPreviewUrl(base, previewPage, previewState);
  }, [previewPage, previewState, siteEditor]);

  const heroSection = useMemo(() => draft?.sections.find((section) => section.key === "hero") ?? null, [draft]);

  function updateDraft(mutator: (current: WebsiteDraft) => WebsiteDraft) {
    setDraft((current) => (current ? mutator(current) : current));
  }

  function updateSection(sectionKey: WebsiteSection["key"], changes: Partial<WebsiteSection>) {
    updateDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.key === sectionKey ? { ...section, ...changes } : section)),
    }));
  }

  function updatePage(pageKey: PageKey, changes: Partial<WebsiteDraft["pages"][number]>) {
    updateDraft((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.key === pageKey ? { ...page, ...changes } : page)),
    }));
  }

  async function handleStatusChange(bookingId: string, status: BookingStatus) {
    if (!businessSlug) {
      return;
    }
    await updateBookingStatus(businessSlug, bookingId, status);
    await loadAdminData(businessSlug);
  }

  async function handlePublish() {
    if (!businessSlug) {
      return;
    }
    setLoading(true);
    try {
      const response = await publishSiteEditor(businessSlug);
      setSiteEditor((current) => (current ? { ...current, site: response.site } : current));
      setPreviewState("published");
    } finally {
      setLoading(false);
    }
  }

  async function handleDomainCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessSlug) {
      return;
    }
    setDomainError(null);
    try {
      const response = await addSiteDomain(businessSlug, domainValue);
      setSiteEditor((current) => (current ? { ...current, domains: [...current.domains, response.domain] } : current));
      setDomainValue("");
    } catch (issue) {
      setDomainError(issue instanceof Error ? issue.message : "Could not add domain.");
    }
  }

  async function handleVerifyDomain(domainId: string) {
    if (!businessSlug) {
      return;
    }
    const response = await verifySiteDomain(businessSlug, domainId);
    setSiteEditor((current) =>
      current
        ? { ...current, domains: current.domains.map((domain) => (domain.id === domainId ? response.domain : domain)) }
        : current,
    );
  }

  async function handleDeleteDomain(domainId: string) {
    if (!businessSlug) {
      return;
    }
    await deleteSiteDomain(businessSlug, domainId);
    setSiteEditor((current) => (current ? { ...current, domains: current.domains.filter((domain) => domain.id !== domainId) } : current));
  }

  async function handleAssetUpload(event: ChangeEvent<HTMLInputElement>, target: "hero" | "og") {
    if (!businessSlug || !event.target.files?.[0]) {
      return;
    }
    const file = event.target.files[0];
    const dataBase64 = await toBase64(file);
    const asset = await uploadSiteAsset(businessSlug, {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64,
    });

    if (target === "hero") {
      updateDraft((current) => ({
        ...current,
        brand: { ...current.brand, heroImage: asset.url, galleryImages: [asset.url, ...current.brand.galleryImages.slice(1)] },
      }));
      updateSection("hero", { media: [asset.url] });
    } else {
      updateDraft((current) => ({
        ...current,
        seo: { ...current.seo, ogImage: asset.url },
      }));
    }
  }

  if (!dashboard || !siteEditor || !draft) {
    return (
      <main className="admin-shell centered">
        <form className="editor-card login-card" onSubmit={handleLogin}>
          <p className="eyebrow">Admin login</p>
          <h1>{businessSlug ? `Enter ${businessSlug}` : "Open admin"}</h1>
          <label className="field">
            <span>Passcode</span>
            <input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} required />
          </label>
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Open dashboard"}
          </button>
          {loginError ? <p className="inline-error">{loginError}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Axora admin</p>
          <h1>{dashboard.business.name}</h1>
          <p className="page-lede">{dashboard.business.settings.dashboardCopy}</p>
        </div>
        <div className="header-actions">
          <span className={`save-pill save-${saveState}`}>{saveState === "saved" ? "Draft saved" : saveState === "saving" ? "Saving draft" : saveState === "error" ? "Save failed" : "Draft ready"}</span>
          <button className="button ghost" onClick={handlePublish} disabled={loading}>
            Publish site
          </button>
          <button className="button ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tab-bar">
        <button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}>Overview</button>
        <button className={activeTab === "website" ? "active" : ""} onClick={() => setActiveTab("website")}>Website</button>
        <button className={activeTab === "domains" ? "active" : ""} onClick={() => setActiveTab("domains")}>Domains</button>
      </nav>

      {activeTab === "overview" ? (
        <section className="overview-grid">
          <div className="metric-grid">
            <MetricCard label="Bookings today" value={String(dashboard.impact.bookingsToday)} />
            <MetricCard label="Bookings this week" value={String(dashboard.impact.bookingsThisWeek)} />
            <MetricCard label="No-shows" value={String(dashboard.impact.noShows)} />
            <MetricCard label="Conversion rate" value={dashboard.impact.conversionRateLabel} />
          </div>

          <div className="editor-card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">Revenue proof</p>
                <h2>Impact frame</h2>
              </div>
              <strong>
                {dashboard.business.settings.kpiExample.leads} leads -&gt; {dashboard.business.settings.kpiExample.bookings} bookings -&gt; {dashboard.business.settings.kpiExample.conversionLabel}
              </strong>
            </div>
            <p>
              This is the business story. The dashboard is not just showing raw records; it is showing how the system moves
              leads into booked revenue and where no-shows break that flow.
            </p>
          </div>

          <div className="editor-card wide-card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">Bookings</p>
                <h2>Recent bookings</h2>
              </div>
              <span>{dashboard.bookings.length} total</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Service</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <strong>{booking.name}</strong>
                        <span>{booking.email}</span>
                      </td>
                      <td>{booking.service}</td>
                      <td>{formatDate(booking.scheduledAt)}</td>
                      <td>
                        <select value={booking.status} onChange={(event) => handleStatusChange(booking.id, event.target.value as BookingStatus)}>
                          <option value="confirmed">confirmed</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                          <option value="no_show">no_show</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="editor-card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">Links</p>
                <h2>Go live</h2>
              </div>
            </div>
            <InfoCard title="Preview site" value={buildPublicPreviewBaseUrl(dashboard.business.slug)} compact />
            <InfoCard title="Booking link" value={buildPublicBookingUrl(dashboard.business.slug)} compact />
            <InfoCard title="Admin route" value={buildAdminUrl(dashboard.business.slug)} compact />
          </div>

          <div className="editor-card">
            <div className="split-heading">
              <div>
                <p className="eyebrow">Activity</p>
                <h2>Recent automations</h2>
              </div>
            </div>
            <ul className="activity-list">
              {dashboard.activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.kind.replace("_", " ")}</strong>
                  <span>{item.toEmail}</span>
                  <small>{item.status}</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {activeTab === "website" ? (
        <section className="website-grid">
          <div className="editor-column">
            <div className="editor-card">
              <p className="eyebrow">Theme</p>
              <h2>Brand system</h2>
              <label className="field">
                <span>Preset</span>
                <select
                  value={draft.templateKey}
                  onChange={(event) => {
                    const nextPreset = event.target.value as ThemePreset;
                    const palette = themeDefaultsForPreset(nextPreset);
                    updateDraft((current) => ({
                      ...current,
                      templateKey: nextPreset,
                      theme: {
                        ...current.theme,
                        presetKey: nextPreset,
                        accent: palette.accent,
                        background: palette.background,
                        surface: palette.surface,
                        text: palette.text,
                      },
                    }));
                  }}
                >
                  {siteEditor.preview.availableThemes.map((preset) => (
                    <option key={preset.key} value={preset.key}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <div className="field-row">
                <label className="field"><span>Accent</span><input type="color" value={draft.theme.accent} onChange={(event) => updateDraft((current) => ({ ...current, theme: { ...current.theme, accent: event.target.value } }))} /></label>
                <label className="field"><span>Background</span><input type="color" value={draft.theme.background} onChange={(event) => updateDraft((current) => ({ ...current, theme: { ...current.theme, background: event.target.value } }))} /></label>
              </div>
            </div>

            <div className="editor-card">
              <p className="eyebrow">Brand</p>
              <h2>Public identity</h2>
              <label className="field"><span>Display name</span><input value={draft.brand.displayName} onChange={(event) => updateDraft((current) => ({ ...current, brand: { ...current.brand, displayName: event.target.value } }))} /></label>
              <label className="field"><span>Logo mark</span><input value={draft.brand.logoMark} onChange={(event) => updateDraft((current) => ({ ...current, brand: { ...current.brand, logoMark: event.target.value } }))} /></label>
              <label className="field"><span>Tagline</span><input value={draft.brand.tagline} onChange={(event) => updateDraft((current) => ({ ...current, brand: { ...current.brand, tagline: event.target.value } }))} /></label>
              <label className="field"><span>Hero image URL</span><input value={draft.brand.heroImage} onChange={(event) => updateDraft((current) => ({ ...current, brand: { ...current.brand, heroImage: event.target.value } }))} /></label>
              <label className="field file-field"><span>Upload hero image</span><input type="file" accept="image/*" onChange={(event) => void handleAssetUpload(event, "hero")} /></label>
            </div>

            <div className="editor-card">
              <p className="eyebrow">Hero and booking</p>
              <h2>First impression</h2>
              <label className="field"><span>Hero headline</span><textarea value={heroSection?.headline ?? ""} onChange={(event) => updateSection("hero", { headline: event.target.value })} /></label>
              <label className="field"><span>Hero body</span><textarea value={heroSection?.body ?? ""} onChange={(event) => updateSection("hero", { body: event.target.value })} /></label>
              <label className="field"><span>Booking headline</span><input value={draft.booking.headline} onChange={(event) => updateDraft((current) => ({ ...current, booking: { ...current.booking, headline: event.target.value } }))} /></label>
              <label className="field"><span>Booking CTA</span><input value={draft.booking.ctaLabel} onChange={(event) => updateDraft((current) => ({ ...current, booking: { ...current.booking, ctaLabel: event.target.value } }))} /></label>
            </div>

            <div className="editor-card">
              <p className="eyebrow">Pages</p>
              <h2>Navigation and page states</h2>
              {draft.pages.map((page) => (
                <div className="mini-panel" key={page.key}>
                  <div className="mini-row">
                    <strong>{page.key}</strong>
                    <label className="toggle">
                      <input type="checkbox" checked={page.enabled} onChange={(event) => updatePage(page.key, { enabled: event.target.checked })} />
                      <span>{page.enabled ? "Enabled" : "Disabled"}</span>
                    </label>
                  </div>
                  <input value={page.label} onChange={(event) => updatePage(page.key, { label: event.target.value })} />
                  <textarea value={page.intro} onChange={(event) => updatePage(page.key, { intro: event.target.value })} />
                </div>
              ))}
            </div>

            <div className="editor-card">
              <p className="eyebrow">SEO</p>
              <h2>Search metadata</h2>
              <label className="field"><span>Site title</span><input value={draft.seo.siteTitle} onChange={(event) => updateDraft((current) => ({ ...current, seo: { ...current.seo, siteTitle: event.target.value } }))} /></label>
              <label className="field"><span>Site description</span><textarea value={draft.seo.siteDescription} onChange={(event) => updateDraft((current) => ({ ...current, seo: { ...current.seo, siteDescription: event.target.value } }))} /></label>
              <label className="field"><span>OG image</span><input value={draft.seo.ogImage} onChange={(event) => updateDraft((current) => ({ ...current, seo: { ...current.seo, ogImage: event.target.value } }))} /></label>
              <label className="field file-field"><span>Upload OG image</span><input type="file" accept="image/*" onChange={(event) => void handleAssetUpload(event, "og")} /></label>
            </div>

            {saveError ? <p className="inline-error">{saveError}</p> : null}
          </div>

          <div className="preview-column">
            <div className="preview-toolbar">
              <div className="toggle-group">
                <button className={previewState === "draft" ? "active" : ""} onClick={() => setPreviewState("draft")}>Draft</button>
                <button className={previewState === "published" ? "active" : ""} onClick={() => setPreviewState("published")}>Published</button>
              </div>
              <div className="toggle-group">
                <button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
                <button className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")}>Mobile</button>
              </div>
              <select value={previewPage} onChange={(event) => setPreviewPage(event.target.value as PageKey)}>
                {draft.pages.filter((page) => page.enabled).map((page) => (
                  <option key={page.key} value={page.key}>{page.label}</option>
                ))}
              </select>
            </div>
            <div className={`preview-frame preview-${viewport}`}>
              <iframe src={previewUrl} title="Website preview" />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "domains" ? (
        <section className="domains-grid">
          <div className="editor-card">
            <p className="eyebrow">Preview domain</p>
            <h2>System-generated preview</h2>
            <InfoCard title="Preview URL" value={buildPublicPreviewBaseUrl(dashboard.business.slug)} compact />
            <p>The preview site is the fastest way to review theme and page changes before the custom domain is connected.</p>
          </div>

          <div className="editor-card">
            <p className="eyebrow">Custom domains</p>
            <h2>Attach the customer's domain</h2>
            <form className="domain-form" onSubmit={handleDomainCreate}>
              <input value={domainValue} onChange={(event) => setDomainValue(event.target.value)} placeholder="www.customerdomain.com" />
              <button className="button primary" type="submit">Add domain</button>
            </form>
            {domainError ? <p className="inline-error">{domainError}</p> : null}
            <div className="domain-list">
              {siteEditor.domains.map((domain) => (
                <div className="domain-item" key={domain.id}>
                  <div>
                    <strong>{domain.hostname}</strong>
                    <span>{domain.kind} · {domain.status}</span>
                    <small>{domain.verification.instructions[0]}</small>
                  </div>
                  <div className="domain-actions">
                    {domain.kind === "custom" && domain.status !== "active" ? <button className="button ghost" onClick={() => void handleVerifyDomain(domain.id)}>Verify</button> : null}
                    {domain.kind === "custom" ? <button className="button ghost" onClick={() => void handleDeleteDomain(domain.id)}>Remove</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
