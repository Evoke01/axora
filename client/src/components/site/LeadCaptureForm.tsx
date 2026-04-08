import type { ResolvedWebsite } from "@business-automation/shared";
import { useState, type FormEvent } from "react";
import { createLead } from "../../api";

export function LeadCaptureForm({ website }: { website: ResolvedWebsite }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createLead(website.business.slug, form);
      setSuccess(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not send inquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <h3>Ask a question first</h3>
      <p>Capture the lead even if they are not ready to book yet. That keeps the conversion math real.</p>
      <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      <input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
      <button type="submit" disabled={submitting}>
        {submitting ? "Sending..." : "Send inquiry"}
      </button>
      {success ? <div className="widget-success">Lead captured. This contact will now appear in the business funnel.</div> : null}
      {error ? <p className="widget-error">{error}</p> : null}
    </form>
  );
}
