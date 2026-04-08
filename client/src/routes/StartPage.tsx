import type { BusinessCreateResult, BusinessType } from "@business-automation/shared";
import { useState, type FormEvent } from "react";
import { createBusiness } from "../api";
import { InfoCard } from "../components/InfoCard";

export function StartPage() {
  const [form, setForm] = useState({ name: "", type: "salon" as BusinessType });
  const [result, setResult] = useState<BusinessCreateResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setResult(await createBusiness(form));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create business.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="page-shell">
        <section className="page-header">
          <p className="eyebrow">Business provisioned</p>
          <h1>{result.business.name} is live in Axora.</h1>
          <p className="page-lede">
            The preview site already exists. Open the admin, tailor the brand, then publish under a custom domain when ready.
          </p>
        </section>
        <div className="result-grid">
          <InfoCard title="Preview website" value={result.previewSiteUrl} />
          <InfoCard title="Booking route" value={result.bookingLink} />
          <InfoCard title="Admin route" value={result.adminLink} />
          <InfoCard title="Admin passcode" value={result.generatedPasscode} />
          <InfoCard title="Theme preset" value={result.themeKey} />
        </div>
        <div className="copy-panel">
          <h2>What the client sees next</h2>
          <ul>
            <li>Their website starts with a type-fit salon or gym theme.</li>
            <li>They can change brand, copy, services, sections, booking CTA, and SEO from admin.</li>
            <li>They can add their own domain and keep Axora branding off the public site.</li>
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">New business</p>
        <h1>Create the business and generate its website.</h1>
        <p className="page-lede">Pick the business type, create the slug, and let Axora provision the first white-label site draft.</p>
      </section>
      <form className="editor-card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Business name</span>
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label className="field">
          <span>Business type</span>
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as BusinessType })}>
            <option value="salon">Salon</option>
            <option value="gym">Gym</option>
          </select>
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create business"}
        </button>
        {error ? <p className="inline-error">{error}</p> : null}
      </form>
    </main>
  );
}
