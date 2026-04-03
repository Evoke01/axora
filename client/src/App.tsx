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
import { startTransition, useDeferredValue, useEffect, useRef, useMemo, useState, type FormEvent, type JSX } from "react";
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

/* ─── Helpers ─────────────────────────────────── */
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

/* ─── Icons ───────────────────────────────────── */
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

/* ─── Main Landing Page ───────────────────────── */
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
      <section className="lp-hero">
        <div className="lp-hero-glow" />
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
        </div>
      </section>

      <div id="what" className="lp-section">
        <div className="lp-section-label">What we do</div>
        <div className="lp-what-grid">
          <div ref={rWhat} className="lp-reveal">
            <div className="lp-what-h">Simple systems that replace repetitive work.</div>
            <p className="lp-what-p">We automate the parts of your business that drain time every day.</p>
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
              <Link to="/start" className="lp-plan-btn">Choose {plan.label}</Link>
            </div>
          ))}
        </div>
      </div>
    </>
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
    return (
      <main className="page page-narrow">
        <section className="page-header">
          <h1>{result.business.name} is ready.</h1>
          <p className="lede">Save your passcode and share the links below.</p>
        </section>
        <div className="surface">
          <LinkField label="Lead link" value={result.leadLink} />
          <LinkField label="Booking link" value={result.bookingLink} />
          <LinkField label="Admin link" value={result.adminLink} />
          <LinkField label="Passcode" value={result.generatedPasscode} />
        </div>
      </main>
    );
  }

  return (
    <main className="page page-narrow">
      <section className="page-header"><h1>Get started</h1></section>
      <form className="launch-form" onSubmit={handleSubmit}>
        <label>Business name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as BusinessType })}><option value="salon">Salon</option><option value="gym">Gym</option></select></label>
        <button className="button primary" type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create business"}</button>
        {error && <p className="feedback error">{error}</p>}
      </form>
    </main>
  );
}

/* ─── AdminPage ───────────────────────────────── */
function AdminPage() {
  const { businessSlug } = useParams();
  const { config, loading: configLoading } = useBusinessConfig(businessSlug);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!businessSlug) return;
    setLoading(true);
    try { await login(businessSlug, passcode); setDashboard(await fetchDashboard(businessSlug)); }
    catch (err) { setError("Invalid passcode."); }
    finally { setLoading(false); }
  }

  const filteredBookings = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.bookings.filter(b => b.name.toLowerCase().includes(deferredSearch.toLowerCase()));
  }, [dashboard, deferredSearch]);

  if (configLoading) return <LoadingPanel label="Loading..." />;

  if (!dashboard) {
    return (
      <main className="page page-narrow">
        <form className="launch-form" onSubmit={handleLogin}>
          <h1>Admin Login</h1>
          <label>Passcode<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required /></label>
          <button className="button primary" type="submit">Enter Dashboard</button>
          {error && <p className="feedback error">{error}</p>}
        </form>
      </main>
    );
  }

  async function handleLogout() {
    if (businessSlug) await logout(businessSlug);
    setDashboard(null);
    setPasscode("");
  }

  return (
    <main className="page">
      <header className="admin-header">
        <h1>{config?.business.name} Admin</h1>
        <button className="button ghost" onClick={handleLogout}>Logout</button>
      </header>
      <div className="metrics-grid">
        <div className="surface"><h3>Total Leads</h3><p>{dashboard.leadSummary.totalLeads}</p></div>
        <div className="surface"><h3>Converted</h3><p>{dashboard.leadSummary.convertedLeads}</p></div>
        <div className="surface"><h3>Bookings This Week</h3><p>{dashboard.impact.bookingsThisWeek}</p></div>
        <div className="surface"><h3>Conversion Rate</h3><p>{dashboard.impact.conversionRateLabel}</p></div>
      </div>
      <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="surface table-container">
        <table>
          <thead><tr><th>Name</th><th>Service</th><th>Status</th></tr></thead>
          <tbody>
            {filteredBookings.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.service}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

/* ─── Shared Components & Custom Hooks ───────── */
function LinkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="link-field" style={{ marginBottom: 15 }}>
      <strong>{label}:</strong>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value={value} style={{ flex: 1 }} />
        <button onClick={() => navigator.clipboard.writeText(value)}>Copy</button>
      </div>
    </div>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return <div className="state-panel"><p>{label}</p></div>;
}

function useBusinessConfig(slug: string | undefined) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (slug) fetchPublicConfig(slug).then(setConfig).finally(() => setLoading(false));
  }, [slug]);
  return { config, loading };
}

/* ─── App Shell ──────────────────────────────── */
export default function App() {
  return (
    <div className="shell">
      <header className="masthead">
        <Link to="/" className="brand"><strong>Axora</strong></Link>
        <nav className="nav">
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/start">Get started</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/admin/:businessSlug" element={<AdminPage />} />
      </Routes>
    </div>
  );
}
