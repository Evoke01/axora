import {
  planCatalog,
  type BookingInput,
  type BookingStatus,
  type BusinessCreateResult,
  type BusinessType,
  type DashboardPayload,
  type LeadInput,
  type Plan,
  type PublicConfig,
} from "@business-automation/shared";
import { startTransition, useDeferredValue, useEffect, useRef, useEffectEvent, useMemo, useState, type FormEvent, type JSX } from "react";
import { Link, NavLink, Route, Routes, useParams } from "react-router-dom";
import {
  createBooking,
  createBusiness,
  createLead,
  fetchDashboard,
  fetchPublicConfig,
  login,
  logout,
  updateBookingStatus,
} from "./api";

function toLocalDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/* ─── Reveal hook ─────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { e.target.classList.add("lp-visible"); io.unobserve(e.target); } },
      { threshold: 0.12 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ─── Demo modal ──────────────────────────────── */
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className={`lp-modal-overlay${open ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lp-modal">
        <button className="lp-modal-close" onClick={onClose}>✕</button>
        <div className="lp-modal-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 011.07 2.35 2 2 0 013.05 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z"/>
          </svg>
        </div>
        <div className="lp-modal-title">Book a Demo</div>
        <div className="lp-modal-sub">Choose how you'd like to reach us. We'll reply within hours.</div>
        <div className="lp-modal-btns">
          <a className="lp-modal-btn" href="https://www.instagram.com/axora.ops" target="_blank" rel="noopener noreferrer">
            <div className="lp-modal-btn-icon lp-ig">
              <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <div className="lp-modal-btn-text">
              <div className="lp-modal-btn-title">Instagram</div>
              <div className="lp-modal-btn-label">@axora.ops — DM us</div>
            </div>
            <span className="lp-modal-btn-arr">→</span>
          </a>
          <div className="lp-modal-divider"><span>or</span></div>
          <a className="lp-modal-btn" href="https://wa.me/919560990607?text=Hi%20Axora!%20I'd%20like%20to%20book%20a%20demo." target="_blank" rel="noopener noreferrer">
            <div className="lp-modal-btn-icon lp-wa">
              <svg viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <div className="lp-modal-btn-text">
              <div className="lp-modal-btn-title">WhatsApp</div>
              <div className="lp-modal-btn-label">+91 95609 90607</div>
            </div>
            <span className="lp-modal-btn-arr">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature icons ────────────────────────────── */
function FeatIcon({ id }: { id: string }) {
  const icons: Record<string, JSX.Element> = {
    phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 011.07 2.35 2 2 0 013.05 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92v2z"/></svg>,
    card:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    file:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    sync:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>,
    ai:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
    live:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  };
  return icons[id] ?? null;
}

/* ─── Landing page ─────────────────────────────── */
function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const rWhat  = useReveal(); const rWhatR = useReveal();
  const rHow   = useReveal(); const rS1    = useReveal();
  const rS2    = useReveal(); const rS3    = useReveal();
  const rFeats = useReveal(); const rPrice = useReveal();
  const rCta   = useReveal();

  const FEATS = [
    { icon:"phone", name:"Lead Auto-response",  desc:"Every new lead gets an instant reply on WhatsApp or email the moment they reach you." },
    { icon:"card",  name:"Payment Reminders",   desc:"Automated follow-up sequences keep collections running without anyone lifting a finger." },
    { icon:"file",  name:"Daily Reports",       desc:"Your team gets a clean business summary every morning. No manual compiling required." },
    { icon:"sync",  name:"Data Sync",           desc:"Google Sheets, your CRM, and every tool you use stay automatically in sync." },
    { icon:"ai",    name:"Basic AI Replies",    desc:"Intelligent auto-responses handle common questions without a human in the loop." },
    { icon:"live",  name:"Live Monitoring",     desc:"Track what's running, what's triggered, and what's been delivered — in real time." },
  ];

  const ITEMS: [string, string, string][] = [
    ["01","Lead capture & response","Instant replies when someone fills a form or inquires"],
    ["02","Payment reminders","Automated sequences until payment is confirmed"],
    ["03","Daily reports","Business summary delivered automatically every morning"],
    ["04","Data sync","Keep your Sheets, CRM, and tools always in sync"],
  ];

  return (
    <>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-shape lp-s1" /><div className="lp-shape lp-s2" />
        <div className="lp-shape lp-s3" /><div className="lp-shape lp-s4" />
        <div className="lp-shape lp-s5" />
        <div className="lp-hero-vignette" />
        <div className="lp-hero-content">
          <div className="lp-badge"><div className="lp-badge-dot" /><span>Business Automation</span></div>
          <h1 className="lp-h1">
            <span className="lp-h1-1">Automate your</span>
            <span className="lp-h1-2">business operations.</span>
          </h1>
          <p className="lp-hero-desc">Leads, payments, and reports handled automatically. No manual follow-ups. No messy spreadsheets.</p>
          <div className="lp-hero-btns">
            <Link to="/start" className="lp-btn-primary">Get started</Link>
            <button className="lp-btn-outline" onClick={() => setDemoOpen(true)}>Book a demo →</button>
          </div>
          <div className="lp-trust">
            <div className="lp-trust-stat"><div className="lp-trust-num">99%</div><div className="lp-trust-label">Uptime</div></div>
            <div className="lp-trust-sep" />
            <div className="lp-trust-stat"><div className="lp-trust-num">24×7</div><div className="lp-trust-label">Always on</div></div>
            <div className="lp-trust-sep" />
            <div className="lp-trust-live"><div className="lp-status-dot" /><span>Live in 🇮🇳 🇦🇪 🇬🇧 🇺🇸</span></div>
          </div>
        </div>
      </section>

      <hr className="lp-hr" />

      {/* WHAT WE DO */}
      <div id="what" className="lp-section">
        <div className="lp-section-label">What we do</div>
        <div className="lp-what-grid">
          <div ref={rWhat} className="lp-reveal">
            <div className="lp-what-h">Simple systems that replace repetitive work.</div>
            <p className="lp-what-p">We automate the parts of your business that drain time every day. No manual follow-ups. Everything runs on its own.</p>
          </div>
          <div ref={rWhatR} className="lp-reveal lp-what-items">
            {ITEMS.map(([n, title, desc]) => (
              <div key={n} className="lp-what-item">
                <span className="lp-wi-n">{n}</span>
                <div><div className="lp-wi-title">{title}</div><div className="lp-wi-desc">{desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" className="lp-how-wrap">
        <div className="lp-how-glow" />
        <div className="lp-section" style={{ paddingTop: 80, paddingBottom: 80 }}>
          <div ref={rHow} className="lp-section-label lp-reveal">How it works</div>
          <div className="lp-steps">
            <div ref={rS1} className="lp-step lp-reveal">
              <div className="lp-step-n">1</div><span className="lp-step-tag">Step one</span>
              <div className="lp-step-title">Capture</div>
              <p className="lp-step-desc">A lead fills a form, makes an inquiry, or data enters your system from any source.</p>
            </div>
            <div ref={rS2} className="lp-step lp-reveal" style={{ transitionDelay: "0.1s" }}>
              <div className="lp-step-n">2</div><span className="lp-step-tag">Step two</span>
              <div className="lp-step-title">Automate</div>
              <p className="lp-step-desc">Actions trigger instantly. No waiting, no manual steps, no one needs to be watching.</p>
            </div>
            <div ref={rS3} className="lp-step lp-reveal" style={{ transitionDelay: "0.2s" }}>
              <div className="lp-step-n">3</div><span className="lp-step-tag">Step three</span>
              <div className="lp-step-title">Output</div>
              <p className="lp-step-desc">Messages sent, records updated, reports delivered. Everything handled automatically.</p>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="lp-section">
        <div className="lp-section-label">Features</div>
        <div ref={rFeats} className="lp-reveal lp-feats-wrap">
          <div className="lp-feats">
            {FEATS.map((f) => (
              <div key={f.name} className="lp-feat">
                <div className="lp-feat-icon"><FeatIcon id={f.icon} /></div>
                <div className="lp-feat-name">{f.name}</div>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="lp-hr" />

      {/* PRICING */}
      <div id="pricing" className="lp-section">
        <div className="lp-section-label">Pricing</div>
        <div ref={rPrice} className="lp-reveal lp-plans">
          {planCatalog.map((plan) => (
            <div key={plan.tier} className={`lp-plan${plan.tier === "pro" ? " lp-featured" : ""}`}>
              {plan.tier === "pro" && <div className="lp-plan-badge">Most popular</div>}
              <div className="lp-plan-tier">{plan.label}</div>
              <div className="lp-plan-price">{plan.priceLabel}</div>
              <p className="lp-plan-tagline">{plan.highlight}</p>
              <ul className="lp-plan-list">{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to="/start" className="lp-plan-btn">{plan.tier === "starter" ? "Launch Starter" : "Request Pro setup"}</Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="lp-cta">
        <div className="lp-cta-glow" />
        <div className="lp-shape lp-cs1" /><div className="lp-shape lp-cs2" />
        <div ref={rCta} className="lp-reveal" style={{ position: "relative", zIndex: 2 }}>
          <div className="lp-cta-h">
            <span className="lp-cta-l1">Stop doing</span>
            <span className="lp-cta-l2">repetitive work.</span>
          </div>
          <p className="lp-cta-sub">Start automating today. Your first workflow is live in 24 hours.</p>
          <div className="lp-hero-btns">
            <button className="lp-btn-primary" onClick={() => setDemoOpen(true)}>Book a Demo</button>
            <Link to="/pricing" className="lp-btn-outline">See all features →</Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   App shell — unchanged below this line
════════════════════════════════════════════════════ */
function App() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="shell">
      <header className={`masthead${scrolled ? " scrolled" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">AX</span>
          <strong>Axora</strong>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : undefined)}>Overview</NavLink>
          <NavLink to="/start" className={({ isActive }) => (isActive ? "active" : undefined)}>Get started</NavLink>
          <NavLink to="/pricing" className={({ isActive }) => (isActive ? "active" : undefined)}>Pricing</NavLink>
        </nav>
        <Link to="/start" className="nav-cta">Get started</Link>
      </header>

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/lead/:businessSlug" element={<LeadPage />} />
        <Route path="/book/:businessSlug" element={<BookingPage />} />
        <Route path="/admin/:businessSlug" element={<AdminPage />} />
      </Routes>

      <footer>
        <p>© 2026 Axora. All rights reserved.</p>
        <div className="footer-links">
          <Link to="/start">Launch app</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── StartPage ───────────────────────────────── */
function StartPage() {
  const [form, setForm] = useState({ name: "", type: "salon" as BusinessType });
  const [result, setResult] = useState<BusinessCreateResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(null);
    try { setResult(await createBusiness(form)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create business."); }
    finally { setSubmitting(false); }
  }

  if (result) {
    const example = result.business.settings.kpiExample;
    return (
      <main className="page page-narrow">
        <section className="page-header">
          <p className="eyebrow">Business created</p>
          <h1>{result.business.name} is ready to start capturing revenue.</h1>
          <p className="lede">Share the public links, keep the generated passcode safe, and start showing owners how inquiries convert.</p>
        </section>
        <section className="success-grid">
          <div className="surface">
            <div className="surface-header compact"><div><h2>Launch links</h2><p>Scoped to the new business slug.</p></div></div>
            <LinkField label="Lead link" value={result.leadLink} />
            <LinkField label="Booking link" value={result.bookingLink} />
            <LinkField label="Admin link" value={result.adminLink} />
            <LinkField label="Generated passcode" value={result.generatedPasscode} />
            <div className="hero-actions" style={{ padding: "16px 20px" }}>
              <a className="button primary" href={result.adminLink}>Open admin</a>
              <a className="button ghost" href={result.bookingLink}>Open booking page</a>
            </div>
          </div>
          <div className="surface">
            <div className="surface-header compact"><div><h2>What the client will see</h2><p>Lead capture and bookings roll up into one revenue story.</p></div></div>
            <div className="example-metric"><span>Example funnel</span><strong>{example.leads} leads → {example.bookings} bookings → {example.conversionLabel} conversion</strong></div>
            <p className="surface-copy">{result.business.settings.dashboardCopy}</p>
            <p className="feedback muted" style={{ margin: "0 20px 20px" }}>The passcode is shown once here. Store it before leaving this screen.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page page-narrow">
      <section className="page-header">
        <p className="eyebrow">Get started</p>
        <h1>Create a business, generate the slug, and hand over working links instantly.</h1>
        <p className="lede">No manual database setup. Enter the name and category — the system creates everything.</p>
      </section>
      <form className="launch-form" onSubmit={handleSubmit}>
        <label>Business name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Luma Salon" required /></label>
        <label>Business type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BusinessType })}>
            <option value="salon">Salon</option><option value="gym">Gym</option>
          </select>
        </label>
        <button className="button primary submit-button" type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create business"}</button>
        {error ? <p className="feedback error">{error}</p> : null}
      </form>
    </main>
  );
}

/* ─── PricingPage ─────────────────────────────── */
function PricingPage() {
  return (
    <main className="page page-narrow">
      <section className="page-header">
        <p className="eyebrow">Pricing</p>
        <h1>Price the system around captured revenue, not generic software seats.</h1>
        <p className="lede">The product exposes plan limits, locked features, and an upgrade path. Billing can come later.</p>
      </section>
      <section className="plans">{planCatalog.map((plan) => <PlanCard key={plan.tier} plan={plan} />)}</section>
    </main>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className={`plan${plan.tier === "pro" ? " plan-accent" : ""}`}>
      <div><p className="plan-tier">{plan.label}</p><h2>{plan.priceLabel}</h2><p className="plan-highlight">{plan.highlight}</p></div>
      <ul className="feature-list">{plan.features.map((f) => <li key={f}>{f}</li>)}</ul>
      {plan.lockedFeatures.length > 0 && (
        <div className="locked"><strong>Premium unlocks</strong><ul className="feature-list muted-list">{plan.lockedFeatures.map((f) => <li key={f}>{f}</li>)}</ul></div>
      )}
      <Link className="plan-btn" to="/start">{plan.tier === "starter" ? "Launch Starter" : "Request Pro setup"}</Link>
    </article>
  );
}

/* ─── LeadPage ────────────────────────────────── */
function LeadPage() {
  const { businessSlug } = useParams();
  const { config, loading, error } = useBusinessConfig(businessSlug);
  const [form, setForm] = useState<LeadInput>({ name:"", email:"", phone:"" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!businessSlug) return;
    setSubmitting(true); setMessage(null); setSubmitError(null);
    try { await createLead(businessSlug, form); setMessage("Lead captured."); setForm({ name:"", email:"", phone:"" }); }
    catch (err) { setSubmitError(err instanceof Error ? err.message : "Could not capture lead."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <LoadingPanel label="Loading lead page..." />;
  if (!config) return <ErrorPanel title="Business unavailable" message={error ?? "This lead page is not active."} />;

  return (
    <main className="page page-narrow">
      <section className="page-header"><p className="eyebrow">{config.business.type} lead funnel</p><h1>{config.business.settings.leadHeadline}</h1><p className="lede">{config.business.settings.leadDescription}</p></section>
      <div className="split-panel">
        <form className="launch-form" onSubmit={handleSubmit}>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <button className="button primary submit-button" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Submit inquiry"}</button>
          {message && <p className="feedback success">{message}</p>}
          {submitError && <p className="feedback error">{submitError}</p>}
        </form>
        <aside className="surface">
          <div className="surface-header compact"><div><h2>Next step</h2><p>When this lead books, conversion updates automatically.</p></div></div>
          <div className="example-metric"><span>Booking link</span><strong>{config.business.bookingLink}</strong></div>
          <a className="button ghost" href={config.business.bookingLink} style={{ padding:"14px 20px",display:"block" }}>Open booking page</a>
        </aside>
      </div>
    </main>
  );
}

/* ─── BookingPage ─────────────────────────────── */
function BookingPage() {
  const { businessSlug } = useParams();
  const { config, loading, error } = useBusinessConfig(businessSlug);
  const [form, setForm] = useState<BookingInput>({ name:"", email:"", phone:"", service:"", scheduledAt: toLocalDateTimeInput(new Date(Date.now() + 24*60*60*1000)) });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => { if (config) setForm((c) => ({ ...c, service: c.service || config.business.services[0] || "" })); }, [config]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!businessSlug) return;
    setSubmitting(true); setMessage(null); setSubmitError(null);
    try { await createBooking(businessSlug, { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }); setMessage("Booking saved. Confirmation sent."); setForm((c) => ({ ...c, name:"", email:"", phone:"" })); }
    catch (err) { setSubmitError(err instanceof Error ? err.message : "Could not create booking."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <LoadingPanel label="Loading booking page..." />;
  if (!config) return <ErrorPanel title="Business unavailable" message={error ?? "This booking page is not active."} />;

  return (
    <main className="page page-narrow">
      <section className="page-header"><p className="eyebrow">{config.business.type} booking</p><h1>{config.business.settings.bookingHeadline}</h1><p className="lede">{config.business.settings.bookingDescription}</p></section>
      <div className="split-panel">
        <form className="launch-form" onSubmit={handleSubmit}>
          <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <label>Service<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{config.business.services.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          <label>Date and time<input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required /></label>
          <button className="button primary submit-button" type="submit" disabled={submitting}>{submitting ? "Scheduling..." : "Confirm booking"}</button>
          {message && <p className="feedback success">{message}</p>}
          {submitError && <p className="feedback error">{submitError}</p>}
        </form>
        <aside className="surface">
          <div className="surface-header compact"><div><h2>What happens next</h2><p>Booking becomes an automation timeline automatically.</p></div></div>
          <ol className="timeline"><li>Immediate confirmation email</li><li>Reminder before scheduled time</li><li>Follow-up after completion</li><li>Re-engagement after configured delay</li></ol>
        </aside>
      </div>
    </main>
  );
}

/* ─── AdminPage ───────────────────────────────── */
function AdminPage() {
  const { businessSlug } = useParams();
  const { config, loading: configLoading, error: configError } = useBusinessConfig(businessSlug);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const loadDashboard = useEffectEvent(async () => {
    if (!businessSlug) { setDashboard(null); setLoading(false); setError("Business not found."); return; }
    setLoading(true);
    try { setDashboard(await fetchDashboard(businessSlug)); setError(null); }
    catch (e) { setDashboard(null); setError(e instanceof Error ? e.message : "Could not load dashboard."); }
    finally { setLoading(false); }
  });

  useEffect(() => { void loadDashboard(); }, [businessSlug, loadDashboard]);

  const filteredBookings = useMemo(() => {
    if (!dashboard) return [];
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return dashboard.bookings;
    return dashboard.bookings.filter((b) => [b.name, b.email, b.phone, b.service, b.status, b.source].some((v) => v.toLowerCase().includes(q)));
  }, [dashboard, deferredSearch]);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!businessSlug) return;
    setLoading(true); setError(null);
    try { await login(businessSlug, passcode); setPasscode(""); await loadDashboard(); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed."); setLoading(false); }
  }

  async function handleStatusChange(id: string, status: BookingStatus) {
    if (!businessSlug) return;
    await updateBookingStatus(businessSlug, id, status);
    startTransition(() => { void loadDashboard(); });
  }

  async function handleLogout() {
    if (!businessSlug) return;
    await logout(businessSlug); setDashboard(null); setError("Admin session closed.");
  }

  if (configLoading) return <LoadingPanel label="Loading admin workspace..." />;
  if (!config) return <ErrorPanel title="Business unavailable" message={configError ?? "This admin route is not active."} />;

  if (!dashboard) {
    return (
      <main className="page page-narrow">
        <section className="page-header"><p className="eyebrow">Admin access</p><h1>{config.business.name} dashboard</h1><p className="lede">Use the generated business passcode to open the impact dashboard.</p></section>
        <form className="launch-form" onSubmit={handleLogin}>
          <label>Business admin passcode<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required /></label>
          <button className="button primary submit-button" type="submit" disabled={loading}>{loading ? "Checking..." : "Enter dashboard"}</button>
          {error && error !== "Admin session required." ? <p className="feedback error">{error}</p> : null}
          {error === "Admin session required." ? <p className="feedback muted">Session not found. Log in to continue.</p> : null}
        </form>
      </main>
    );
  }

  const activePlan = dashboard.plans.find((p) => p.tier === dashboard.business.currentPlan) ?? dashboard.plans[0];
  const presetExample = dashboard.business.settings.kpiExample;

  return (
    <main className="dashboard-page">
      <section className="dashboard-top">
        <div><p className="eyebrow">Impact dashboard</p><h1>{dashboard.business.name}</h1><p className="lede">{dashboard.business.settings.dashboardCopy}</p></div>
        <div className="toolbar">
          <button className="button ghost" onClick={() => startTransition(() => void loadDashboard())}>Refresh</button>
          <button className="button ghost" onClick={handleLogout}>Logout</button>
        </div>
      </section>
      <section className="metrics metrics-four">
        <MetricCard label="Bookings today" value={String(dashboard.impact.bookingsToday)} note="Scheduled for today" />
        <MetricCard label="Bookings this week" value={String(dashboard.impact.bookingsThisWeek)} note="Scheduled this week" />
        <MetricCard label="No-shows" value={String(dashboard.impact.noShows)} note="Status marked no_show" />
        <MetricCard label="Conversion rate" value={dashboard.impact.conversionRateLabel} note="Booked leads / total leads" />
      </section>
      <section className="dashboard-grid">
        <div className="main-rail">
          <section className="surface money-surface">
            <div className="surface-header compact"><div><h2>Why this matters</h2><p>Show the owner what the funnel is producing.</p></div></div>
            <div className="money-grid">
              <div className="money-card accent"><span>Current funnel</span><strong>{dashboard.leadSummary.totalLeads} leads → {dashboard.leadSummary.convertedLeads} bookings</strong><small>{dashboard.impact.conversionRateLabel} conversion</small></div>
              <div className="money-card"><span>Example sales story</span><strong>{presetExample.leads} leads → {presetExample.bookings} bookings</strong><small>{presetExample.conversionLabel} conversion</small></div>
              <div className="money-card"><span>Open leads</span><strong>{dashboard.leadSummary.openLeads}</strong><small>Still available to convert</small></div>
            </div>
          </section>
          <section className="surface bookings-surface">
            <div className="surface-header"><div><h2>Bookings</h2><p>Operational detail below the KPI layer.</p></div><input className="search-input" placeholder="Search bookings" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Service</th><th>When</th><th>Source</th><th>Status</th><th>Change</th></tr></thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.name}</strong><span>{b.email}</span></td>
                      <td>{b.service}</td>
                      <td>{formatDate(b.scheduledAt)}</td>
                      <td><span className={`status-pill status-${b.source}`}>{b.source}</span></td>
                      <td><span className={`status-pill status-${b.status}`}>{b.status.replace("_"," ")}</span></td>
                      <td><select value={b.status} onChange={(e) => void handleStatusChange(b.id, e.target.value as BookingStatus)}><option value="confirmed">confirmed</option><option value="completed">completed</option><option value="cancelled">cancelled</option><option value="no_show">no_show</option></select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="side-rail">
          <section className="surface">
            <div className="surface-header compact"><div><h2>Activity feed</h2><p>Every message write stays visible.</p></div></div>
            <ul className="activity-list">
              {dashboard.activity.map((entry) => (
                <li key={entry.id}>
                  <div><strong>{entry.kind.replace("_"," ")}</strong><p>{entry.subject}</p></div>
                  <div className="activity-meta"><span className={`status-pill status-${entry.status}`}>{entry.status}</span><small>{entry.toEmail}</small></div>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface">
            <div className="surface-header compact"><div><h2>Lead summary</h2><p>Track what's still open in the funnel.</p></div></div>
            <ul className="feature-list muted-list" style={{ padding:"12px 20px" }}>
              <li>Total leads: {dashboard.leadSummary.totalLeads}</li>
              <li>Converted: {dashboard.leadSummary.convertedLeads}</li>
              <li>Open: {dashboard.leadSummary.openLeads}</li>
            </ul>
          </section>
          <section className="surface plan-surface">
            <div className="surface-header compact"><div><h2>Current plan</h2><p>{activePlan.highlight}</p></div></div>
            <div className="example-metric"><span>{activePlan.label}</span><strong>{activePlan.priceLabel}</strong></div>
            <a className="button primary" href={`mailto:${dashboard.business.supportEmail}?subject=${encodeURIComponent(`Upgrade ${dashboard.business.name} to Pro`)}`} style={{ margin:"0 20px 20px",display:"block",textAlign:"center" }}>Upgrade to Pro</a>
          </section>
        </aside>
      </section>
    </main>
  );
}

/* ─── Shared helpers ──────────────────────────── */
function useBusinessConfig(businessSlug: string | undefined) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useEffectEvent(async () => {
    if (!businessSlug) { setConfig(null); setError("Business not found."); setLoading(false); return; }
    setLoading(true);
    try { setConfig(await fetchPublicConfig(businessSlug)); setError(null); }
    catch (e) { setConfig(null); setError(e instanceof Error ? e.message : "Could not load business."); }
    finally { setLoading(false); }
  });
  useEffect(() => { void load(); }, [businessSlug, load]);
  return { config, loading, error };
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function LinkField({ label, value }: { label: string; value: string }) {
  return <label className="link-field"><span>{label}</span><input readOnly value={value} /></label>;
}
function LoadingPanel({ label }: { label: string }) {
  return <main className="page page-narrow"><section className="surface loading-panel"><p className="eyebrow">Loading</p><h2>{label}</h2></section></main>;
}
function ErrorPanel({ title, message }: { title: string; message: string }) {
  return <main className="page page-narrow"><section className="surface"><p className="eyebrow">Error</p><h2>{title}</h2><p className="surface-copy">{message}</p><Link className="button ghost" to="/start">Create a business</Link></section></main>;
}

export default App;
