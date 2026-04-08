import type { ResolvedWebsite } from "@business-automation/shared";
import { useEffect, useState, type FormEvent } from "react";
import { createBooking } from "../../api";

export function BookingWidget({ website }: { website: ResolvedWebsite }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: website.business.services[0] ?? "",
    scheduledAt: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.service && website.business.services[0]) {
      setForm((current) => ({ ...current, service: website.business.services[0] ?? "" }));
    }
  }, [form.service, website.business.services]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createBooking(website.business.slug, {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      setSuccess(true);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="booking-widget" id="booking-widget">
      <div className="widget-copy">
        <span>{website.site.booking.headline}</span>
        <h3>{website.site.booking.body}</h3>
      </div>
      {success ? (
        <div className="widget-success">Booking confirmed. The confirmation and reminder flow is now active.</div>
      ) : (
        <form className="widget-form" onSubmit={handleSubmit}>
          <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input placeholder="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
          <select value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })}>
            {website.business.services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} required />
          <button type="submit" disabled={submitting}>
            {submitting ? "Booking..." : website.site.booking.ctaLabel}
          </button>
          {error ? <p className="widget-error">{error}</p> : null}
        </form>
      )}
    </div>
  );
}
