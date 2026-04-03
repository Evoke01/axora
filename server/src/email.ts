import type { Booking, BusinessType, EmailMode, MessageKind } from "@business-automation/shared";
import { Resend } from "resend";
import type { AppConfig } from "./config.js";

export type EmailDeliveryResult = {
  deliveryMode: EmailMode;
  status: "sent" | "failed" | "skipped";
  subject: string;
  providerMessageId?: string | null;
  error?: string | null;
};

type EmailBusinessContext = {
  businessName: string;
  businessType: BusinessType;
};

function buildEmail(kind: MessageKind, booking: Booking, context: EmailBusinessContext) {
  const parsedDate = new Date(booking.scheduledAt);
  const dateStr = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsedDate);
  const timeStr = new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(parsedDate);
  const when = `${dateStr}, ${timeStr}`;

  const businessNoun = context.businessType === "gym" ? "session" : "visit";

  const subjects: Record<MessageKind, string> = {
    confirmation: `${booking.service} booked at ${context.businessName} for ${when}`,
    reminder: `Reminder: your ${booking.service} up at ${context.businessName}`,
    follow_up: `How was your ${booking.service} at ${context.businessName}?`,
    reengagement: `Ready for your next ${businessNoun} with ${context.businessName}?`,
  };

  const headlines: Record<MessageKind, string> = {
    confirmation: "Appointment Confirmed",
    reminder: "Upcoming Appointment Reminder",
    follow_up: "How was your visit?",
    reengagement: "Time for your next visit?",
  };

  const bodies: Record<MessageKind, string> = {
    confirmation: "Your appointment has been successfully scheduled. Here are the details:",
    reminder: "This is a quick reminder that your appointment is coming up soon. Here are the details:",
    follow_up: `Thanks for choosing ${context.businessName}. We would love to help you book your next ${businessNoun}.`,
    reengagement: `It might be time for your next ${booking.service}. Reply to this email to book another slot with ${context.businessName}.`,
  };

  const isUpcoming = kind === "confirmation" || kind === "reminder";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  </head>
  <body>
    <!--$--><!--html--><!--head--><!--body-->
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tbody>
                <tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%">
                      <tbody>
                        <tr>
                          <td>
                            <div style="margin:auto;padding:20px;font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:520px;border:1px solid #eee;border-radius:10px">
                              <h2 style="margin:0 0 15px 0;padding:0">
                                ${headlines[kind]}
                              </h2>
                              <p style="margin:0 0 10px 0;padding:0">
                                Hi ${booking.name},
                              </p>
                              <p style="margin:0 0 15px 0;padding:0">
                                ${bodies[kind]}
                              </p>
                              ${isUpcoming ? `
                              <div style="margin:0;padding:12px 15px;background:#f7f7f7;border-radius:8px;margin-bottom:15px">
                                <p style="margin:0;padding:0">
                                  <strong>Service:</strong> ${booking.service}
                                </p>
                                <p style="margin:0;padding:0">
                                  <strong>Date:</strong> ${dateStr}
                                </p>
                                <p style="margin:0;padding:0">
                                  <strong>Time:</strong> ${timeStr}
                                </p>
                              </div>
                              <p style="margin:0 0 15px 0;padding:0">
                                Please arrive 5 minutes early to ensure a smooth experience.
                              </p>
                              ` : ""}
                              <p style="margin:0;padding:0">
                                We’ll notify you if there are any updates.
                              </p>
                            </div>
                            <p style="margin:0;padding:0"><br /></p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--/$-->
  </body>
</html>`;

  return {
    subject: subjects[kind],
    html,
  };
}

export class EmailService {
  private readonly resend: Resend | null;

  constructor(private readonly appConfig: AppConfig) {
    this.resend = appConfig.RESEND_API_KEY ? new Resend(appConfig.RESEND_API_KEY) : null;
  }

  async send(kind: MessageKind, booking: Booking, context: EmailBusinessContext): Promise<EmailDeliveryResult> {
    const payload = buildEmail(kind, booking, context);

    if (this.appConfig.EMAIL_MODE === "demo") {
      return {
        deliveryMode: "demo",
        status: "sent",
        subject: payload.subject,
        providerMessageId: `demo-${kind}-${booking.id}`,
      };
    }

    if (!this.resend) {
      return {
        deliveryMode: "live",
        status: "failed",
        subject: payload.subject,
        error: "RESEND_API_KEY is required in live email mode.",
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.appConfig.RESEND_FROM_EMAIL,
        to: booking.email,
        subject: payload.subject,
        html: payload.html,
      });

      if (response.error) {
        return {
          deliveryMode: "live",
          status: "failed",
          subject: payload.subject,
          error: response.error.message,
        };
      }

      return {
        deliveryMode: "live",
        status: "sent",
        subject: payload.subject,
        providerMessageId: response.data?.id ?? null,
      };
    } catch (error) {
      return {
        deliveryMode: "live",
        status: "failed",
        subject: payload.subject,
        error: error instanceof Error ? error.message : "Unexpected email delivery failure.",
      };
    }
  }
}
