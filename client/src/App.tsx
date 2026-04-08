import { Link, NavLink, Route, Routes } from "react-router-dom";
import { AdminPage } from "./routes/AdminPage";
import { LandingPage } from "./routes/LandingPage";
import { SitePreviewPage } from "./routes/SitePreviewPage";
import { StartPage } from "./routes/StartPage";
import { getPublicWebsiteOrigin } from "./lib/site";

function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">Route not found</p>
        <h1>This page is not part of the Axora shell.</h1>
        <p className="page-lede">Customer websites now live in the separate website app.</p>
      </section>
    </main>
  );
}

export default function App() {
  const websiteOrigin = getPublicWebsiteOrigin();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          Axora
        </Link>
        <nav>
          <NavLink to="/">Overview</NavLink>
          <NavLink to="/start">Get Started</NavLink>
          <a href={websiteOrigin} target="_blank" rel="noreferrer">
            Website app
          </a>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/start" element={<StartPage />} />
        <Route path="/admin/:businessSlug" element={<AdminPage />} />
        <Route path="/preview/:businessSlug/*" element={<SitePreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}
