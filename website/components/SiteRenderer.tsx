import type { ResolvedWebsite, WebsiteSection } from "@business-automation/shared";
import type { CSSProperties } from "react";
import { BookingWidget } from "./BookingWidget";
import { LeadCaptureForm } from "./LeadCaptureForm";

function resolvePage(website: ResolvedWebsite, pageKey: string | null) {
  if (!pageKey || pageKey === "home") {
    return website.site.pages.find((page) => page.key === "home") ?? website.site.pages[0];
  }

  return (
    website.site.pages.find((page) => page.slug === pageKey || page.key === pageKey) ??
    website.site.pages.find((page) => page.key === "home") ??
    website.site.pages[0]
  );
}

function getSection(site: ResolvedWebsite["site"], key: WebsiteSection["key"]) {
  return site.sections.find((section) => section.key === key && section.enabled);
}

function sectionClass(section: WebsiteSection) {
  return `site-section section-${section.layout}`;
}

export function SiteRenderer({
  website,
  currentPage,
  routeMode,
}: {
  website: ResolvedWebsite;
  currentPage: string | null;
  routeMode: "page" | "booking";
}) {
  const page = resolvePage(website, currentPage);
  const visibleSections = page.sections.map((key) => getSection(website.site, key)).filter(Boolean) as WebsiteSection[];
  const isSalon = website.business.type === "salon";
  const shouldShowBooking = routeMode === "booking" || page.key === "home" || page.key === "services" || page.key === "contact";

  const themeStyle = {
    "--site-bg": website.site.theme.background,
    "--site-surface": website.site.theme.surface,
    "--site-text": website.site.theme.text,
    "--site-muted": website.site.theme.mutedText,
    "--site-accent": website.site.theme.accent,
    "--site-border": website.site.theme.borderColor,
    "--site-card": website.site.theme.cardSurface,
    "--site-radius": website.site.theme.cornerStyle === "sharp" ? "12px" : website.site.theme.cornerStyle === "organic" ? "34px" : "22px",
  } as CSSProperties;

  return (
    <div className={`site-root ${isSalon ? "site-salon" : "site-gym"}`} style={themeStyle}>
      <div className="site-backdrop" />
      <header className="site-header">
        <a className="site-brand" href="/">
          <span>{website.site.brand.logoMark}</span>
          <div>
            <strong>{website.site.brand.displayName}</strong>
            <small>{website.site.brand.tagline}</small>
          </div>
        </a>
        <nav className="site-nav">
          {website.site.pages.filter((item) => item.enabled).map((item) => (
            <a key={item.key} href={item.key === "home" ? "/" : `/${item.slug}`}>
              {item.label}
            </a>
          ))}
          <a className="nav-cta" href="/book">
            {website.site.booking.ctaLabel}
          </a>
        </nav>
      </header>

      <main className="site-main">
        <section className={`site-hero ${isSalon ? "hero-editorial" : "hero-performance"}`}>
          <div className="hero-media">
            <img src={website.site.brand.heroImage} alt={website.site.brand.displayName} />
          </div>
          <div className="hero-content">
            <p>{getSection(website.site, "hero")?.eyebrow ?? website.site.brand.tagline}</p>
            <h1>{getSection(website.site, "hero")?.headline ?? website.site.brand.displayName}</h1>
            <p className="hero-body">{getSection(website.site, "hero")?.body ?? page.intro}</p>
            <div className="hero-buttons">
              <a className="site-button primary" href="/book">
                {website.site.booking.ctaLabel}
              </a>
              <a className="site-button ghost" href="/contact">
                Contact
              </a>
            </div>
          </div>
        </section>

        {routeMode === "booking" ? (
          <section className="page-layout">
            <div className="page-intro">
              <p>Booking page</p>
              <h2>{website.site.booking.headline}</h2>
              <p>{website.site.booking.body}</p>
            </div>
            <BookingWidget website={website} />
          </section>
        ) : (
          <section className="page-layout">
            <div className="page-intro">
              <p>{page.label}</p>
              <h2>{page.intro}</h2>
              <p>{website.site.seo.siteDescription}</p>
            </div>

            {visibleSections.map((section) => (
              <section className={sectionClass(section)} key={section.key}>
                <div className="section-copy">
                  <span>{section.eyebrow}</span>
                  <h3>{section.headline}</h3>
                  <p>{section.body}</p>
                  {section.ctaLabel ? (
                    <a className="site-button ghost" href={section.ctaHref || "/book"}>
                      {section.ctaLabel}
                    </a>
                  ) : null}
                </div>

                {section.items.length > 0 ? (
                  <div className="section-grid-cards">
                    {section.items.map((item) => (
                      <article className="content-card" key={item.id}>
                        {item.badge ? <span>{item.badge}</span> : null}
                        <h4>{item.title}</h4>
                        <p>{item.description}</p>
                        {item.meta ? <small>{item.meta}</small> : null}
                        {item.priceLabel ? <strong>{item.priceLabel}</strong> : null}
                      </article>
                    ))}
                  </div>
                ) : null}

                {section.media.length > 0 ? (
                  <div className="section-media-strip">
                    {section.media.map((media, index) => (
                      <img key={`${section.key}-${index}`} src={media} alt={section.headline} />
                    ))}
                  </div>
                ) : null}

                {section.key === "contact" ? <LeadCaptureForm website={website} /> : null}
              </section>
            ))}

            {shouldShowBooking ? <BookingWidget website={website} /> : null}
          </section>
        )}
      </main>

      {website.site.booking.showStickyMobile ? (
        <a className="sticky-cta" href="#booking-widget">
          {website.site.booking.stickyLabel}
        </a>
      ) : null}
    </div>
  );
}
