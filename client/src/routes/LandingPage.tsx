import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="marketing-shell">
      <section className="hero-block">
        <div className="hero-copy">
          <p className="eyebrow">White-label sites for service businesses</p>
          <h1>Axora creates the website, funnel, and booking automation together.</h1>
          <p className="hero-lede">
            A salon or gym owner should not land on an Axora-looking page with swapped text. They should get a real brand,
            a real website, a live booking flow, and an admin that lets them keep shaping it.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/start">
              Get Started
            </Link>
            <a className="button ghost" href="#system">
              Explore the system
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <div className="site-snapshot">
            <span>Website output</span>
            <strong>Customer-owned look and feel</strong>
            <p>Theme preset, domain, booking widget, contact funnel, SEO, and admin-controlled publishing.</p>
          </div>
          <div className="site-snapshot accent">
            <span>Admin outcome</span>
            <strong>Edit once, publish fast</strong>
            <p>Theme, pages, sections, booking CTA, SEO, and domains are all editable from one admin workspace.</p>
          </div>
        </div>
      </section>

      <section className="section-grid" id="system">
        <article>
          <p className="eyebrow">How it works</p>
          <h2>Create the business. Generate the site. Publish the brand.</h2>
          <p>
            The moment a business is created, Axora provisions a white-label preview website, business-scoped booking flow,
            impact dashboard, and an editable CMS for theme, content, pages, SEO, and domains.
          </p>
        </article>
        <div className="stack-list">
          <div className="stack-item">
            <strong>1. Business creation</strong>
            <span>Business slug, passcode, preview site, admin route, and base theme all get generated.</span>
          </div>
          <div className="stack-item">
            <strong>2. Website customization</strong>
            <span>Change brand, copy, sections, booking CTA, SEO, and domain without touching code.</span>
          </div>
          <div className="stack-item">
            <strong>3. Revenue visibility</strong>
            <span>Track bookings today, bookings this week, no-shows, and lead-to-booking conversion from the same admin.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
