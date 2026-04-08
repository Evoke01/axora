import {
  adminLoginSchema,
  bookingInputSchema,
  bookingStatusSchema,
  businessCreateInputSchema,
  businessPresets,
  defaultThemeKeyByBusinessType,
  leadInputSchema,
  planCatalog,
  themePresetCatalog,
  websiteAssetUploadSchema,
  websiteDomainCreateInputSchema,
  websiteDomainVerifyInputSchema,
  websitePatchSchema,
  type Booking,
  type BookingInput,
  type BookingStatus,
  type Business,
  type BusinessCreateInput,
  type BusinessCreateResult,
  type BusinessIdentity,
  type BusinessType,
  type DashboardPayload,
  type LeadInput,
  type MessageKind,
  type PreviewState,
  type PublicConfig,
  type ResolvedWebsite,
  type SiteEditorPayload,
  type ThemePreset,
  type WebsiteAssetUploadResult,
  type WebsiteConfig,
  type WebsiteDomain,
  type WebsiteDraft,
  type WebsitePatch,
  type WebsiteTheme,
} from "@business-automation/shared";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import type { AppConfig } from "./config.js";
import type { EmailService } from "./email.js";
import type { PendingJob, Repository } from "./repository.js";
import type { Scheduler } from "./scheduler.js";
import type { WebsiteDomainProvider } from "./vercel-domains.js";

type HttpError = Error & { statusCode?: number };

function createHttpError(statusCode: number, message: string) {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "business";
}

function generatePasscode(type: BusinessType) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = type === "salon" ? "SLN-" : "GYM-";
  const bytes = randomBytes(6);
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

function hashPasscode(passcode: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPasscode(passcode: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }
  const derived = scryptSync(passcode, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(stored, derived);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date) {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AX";
}

function buildThemePreset(themeKey: ThemePreset): WebsiteTheme {
  const presets: Record<ThemePreset, WebsiteTheme> = {
    "salon-editorial": {
      presetKey: "salon-editorial",
      accent: "#d4a373",
      background: "#111111",
      surface: "#171717",
      text: "#f8f5ef",
      mutedText: "#cdbfae",
      cardSurface: "#1f1a17",
      borderColor: "rgba(212,163,115,0.22)",
      headingFont: "\"Cormorant Garamond\", serif",
      bodyFont: "\"Manrope\", sans-serif",
      buttonStyle: "pill",
      cornerStyle: "organic",
      sectionSpacing: "airy",
    },
    "salon-premium-beauty": {
      presetKey: "salon-premium-beauty",
      accent: "#9d4edd",
      background: "#f8f4ff",
      surface: "#ffffff",
      text: "#241335",
      mutedText: "#6f5b86",
      cardSurface: "#f2eafe",
      borderColor: "rgba(157,78,221,0.18)",
      headingFont: "\"Playfair Display\", serif",
      bodyFont: "\"Inter\", sans-serif",
      buttonStyle: "soft-square",
      cornerStyle: "rounded",
      sectionSpacing: "comfortable",
    },
    "salon-soft-luxury": {
      presetKey: "salon-soft-luxury",
      accent: "#b08968",
      background: "#fcf7f1",
      surface: "#fffdfb",
      text: "#35261f",
      mutedText: "#8a6f61",
      cardSurface: "#f5eee7",
      borderColor: "rgba(176,137,104,0.18)",
      headingFont: "\"DM Serif Display\", serif",
      bodyFont: "\"Manrope\", sans-serif",
      buttonStyle: "pill",
      cornerStyle: "organic",
      sectionSpacing: "airy",
    },
    "gym-performance": {
      presetKey: "gym-performance",
      accent: "#f97316",
      background: "#090909",
      surface: "#101010",
      text: "#f8fafc",
      mutedText: "#94a3b8",
      cardSurface: "#161616",
      borderColor: "rgba(249,115,22,0.24)",
      headingFont: "\"Bebas Neue\", sans-serif",
      bodyFont: "\"Inter\", sans-serif",
      buttonStyle: "soft-square",
      cornerStyle: "sharp",
      sectionSpacing: "comfortable",
    },
    "gym-coaching": {
      presetKey: "gym-coaching",
      accent: "#14b8a6",
      background: "#061311",
      surface: "#0b1b18",
      text: "#ecfeff",
      mutedText: "#91d7d0",
      cardSurface: "#10302b",
      borderColor: "rgba(20,184,166,0.24)",
      headingFont: "\"Anton\", sans-serif",
      bodyFont: "\"Manrope\", sans-serif",
      buttonStyle: "outline",
      cornerStyle: "sharp",
      sectionSpacing: "comfortable",
    },
    "gym-membership": {
      presetKey: "gym-membership",
      accent: "#2563eb",
      background: "#eef4ff",
      surface: "#ffffff",
      text: "#13233e",
      mutedText: "#566a8c",
      cardSurface: "#eff6ff",
      borderColor: "rgba(37,99,235,0.16)",
      headingFont: "\"Sora\", sans-serif",
      bodyFont: "\"Inter\", sans-serif",
      buttonStyle: "pill",
      cornerStyle: "rounded",
      sectionSpacing: "comfortable",
    },
  };

  return presets[themeKey];
}

function themeForBusinessType(type: BusinessType, themeKey?: ThemePreset) {
  const selected = themeKey ?? defaultThemeKeyByBusinessType[type];
  return buildThemePreset(selected);
}

function buildPreviewPath(slug: string, page: string | null = null) {
  return `/preview/${slug}${page ? `/${page}` : ""}`;
}

function sanitizeHost(rawHost: string) {
  return rawHost.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

function sanitizeHostnameInput(rawHostname: string) {
  const value = sanitizeHost(rawHostname).replace(/\.$/, "");
  if (!value.includes(".")) {
    throw createHttpError(400, "Custom domains must include a valid hostname.");
  }
  return value;
}

function buildWebsiteDraft(business: Business, themeKey: ThemePreset): WebsiteDraft {
  const theme = themeForBusinessType(business.type, themeKey);
  const serviceItems = business.settings.services.map((service, index) => ({
    id: `${slugify(service)}-${index + 1}`,
    title: service,
    description:
      business.type === "salon"
        ? `A signature ${service} experience tailored to your schedule, style, and repeat-booking potential.`
        : `A focused ${service} offer designed to move prospects from interest into action.`,
    meta: business.type === "salon" ? "45-75 min" : "Flexible sessions",
    priceLabel: business.type === "salon" ? "From $35" : "From $49",
    badge: index === 0 ? "Most booked" : null,
    image: null,
  }));

  const isSalon = business.type === "salon";
  const heroImage = isSalon
    ? "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80"
    : "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=80";
  const secondaryImage = isSalon
    ? "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=80";
  const thirdImage = isSalon
    ? "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80";

  const pages: WebsiteDraft["pages"] = [
    {
      key: "home",
      label: "Home",
      slug: "",
      enabled: true,
      intro: isSalon ? "Luxury care, clean systems, effortless rebooking." : "Serious training, clear offers, easy conversion.",
      sections: ["announcement", "hero", "offers", "services", "testimonials", "gallery", "cta"],
    },
    {
      key: "services",
      label: isSalon ? "Services" : "Programs",
      slug: "services",
      enabled: true,
      intro: isSalon ? "Signature treatments and routine appointments." : "Memberships, coaching, and training offers.",
      sections: ["services", "memberships", "trust", "cta"],
    },
    {
      key: "about",
      label: "About",
      slug: "about",
      enabled: true,
      intro: isSalon ? "Why clients keep coming back." : "The system and coaching style behind the results.",
      sections: ["about", "staff", "trust", "cta"],
    },
    {
      key: "gallery",
      label: "Gallery",
      slug: "gallery",
      enabled: true,
      intro: isSalon ? "See the mood, finish, and quality of the work." : "See the space, energy, and member momentum.",
      sections: ["gallery", "testimonials", "cta"],
    },
    {
      key: "contact",
      label: "Contact",
      slug: "contact",
      enabled: true,
      intro: isSalon ? "Questions, consultations, and location details." : "Ask about trials, coaching, and visit details.",
      sections: ["contact", "faq", "cta"],
    },
  ];

  const sections: WebsiteDraft["sections"] = [
    {
      key: "announcement",
      enabled: true,
      label: "Announcement Bar",
      eyebrow: "Now Booking",
      headline: isSalon ? "New-client glow packages are open this month." : "This month's intro sessions are open now.",
      body: isSalon
        ? "Use the booking widget to lock your first visit and trigger the full reminder flow automatically."
        : "Start with a trial, intro consultation, or coaching call and move leads into bookings without manual follow-up.",
      layout: "stack",
      ctaLabel: isSalon ? "View services" : "Start trial",
      ctaHref: "/services",
      items: [],
      media: [],
    },
    {
      key: "hero",
      enabled: true,
      label: "Hero",
      eyebrow: isSalon ? "Salon website" : "Fitness website",
      headline: isSalon
        ? `${business.name} makes premium appointments feel effortless.`
        : `${business.name} turns interest into booked sessions and memberships.`,
      body: isSalon
        ? "A white-label salon site with elevated copy, a strong first impression, and built-in booking automation from the first click."
        : "A performance-led fitness site with strong social proof, a themed booking widget, and a cleaner path from lead to session.",
      layout: isSalon ? "editorial" : "split",
      ctaLabel: isSalon ? "Book a consultation" : "Book intro session",
      ctaHref: "/book",
      items: [
        {
          id: "hero-proof-1",
          title: business.settings.kpiExample.conversionLabel,
          description: "Example conversion rate",
          meta: `${business.settings.kpiExample.leads} leads to ${business.settings.kpiExample.bookings} bookings`,
          priceLabel: null,
          badge: "Impact",
          image: null,
        },
      ],
      media: [heroImage],
    },
    {
      key: "offers",
      enabled: true,
      label: "Offers",
      eyebrow: isSalon ? "Popular offers" : "Popular entry points",
      headline: isSalon ? "Packages that move first-time interest into repeat bookings." : "Offers designed to turn warm leads into active members.",
      body: isSalon
        ? "Promotions, memberships, and featured treatments can all be turned on or off inside the admin."
        : "Trials, transformation offers, and membership bundles can be rotated without rebuilding the site.",
      layout: "grid",
      ctaLabel: "Customize offers",
      ctaHref: "/admin",
      items: isSalon
        ? [
            {
              id: "offer-1",
              title: "New client refresh",
              description: "Haircut, treatment, and styling bundle.",
              meta: "Best for first visit",
              priceLabel: "$79",
              badge: "Promo",
              image: null,
            },
            {
              id: "offer-2",
              title: "Monthly glow plan",
              description: "Facial membership with rolling rebooking prompts.",
              meta: "Repeat revenue",
              priceLabel: "$129/mo",
              badge: "Membership",
              image: null,
            },
          ]
        : [
            {
              id: "offer-1",
              title: "7-day trial",
              description: "An easy starting point for new leads.",
              meta: "Low friction",
              priceLabel: "$19",
              badge: "Trial",
              image: null,
            },
            {
              id: "offer-2",
              title: "Coaching bundle",
              description: "Three personal sessions plus a membership consult.",
              meta: "High intent",
              priceLabel: "$149",
              badge: "Coaching",
              image: null,
            },
          ],
      media: [],
    },
    {
      key: "services",
      enabled: true,
      label: "Services",
      eyebrow: isSalon ? "Services" : "Programs",
      headline: isSalon ? "Signature services built for rebooking." : "Programs built for consistency and visible progress.",
      body: isSalon
        ? "Every service block can be edited, reordered, and featured in the booking widget."
        : "Every program block can be turned into a trial or membership CTA and tied directly to booking.",
      layout: "grid",
      ctaLabel: isSalon ? "Book a visit" : "Start trial",
      ctaHref: "/book",
      items: serviceItems,
      media: [],
    },
    {
      key: "about",
      enabled: true,
      label: "About",
      eyebrow: "About",
      headline: isSalon
        ? `${business.name} blends design-led care with consistent client retention.`
        : `${business.name} is built around consistency, accountability, and repeatable member growth.`,
      body: isSalon
        ? "Use this section to explain your experience, point of view, and why clients trust your work."
        : "Use this section to explain the coaching method, member journey, and what makes the training environment different.",
      layout: "split",
      ctaLabel: "Meet the team",
      ctaHref: "/about",
      items: [
        {
          id: "about-1",
          title: isSalon ? "Experience" : "Training system",
          description: isSalon
            ? "Detail the signature experience from first consultation to follow-up."
            : "Explain the structure behind onboarding, coaching, and retention.",
          meta: isSalon ? "Premium service flow" : "Results-driven programming",
          priceLabel: null,
          badge: null,
          image: null,
        },
      ],
      media: [secondaryImage],
    },
    {
      key: "staff",
      enabled: true,
      label: "Staff",
      eyebrow: "Team",
      headline: isSalon ? "The people behind the experience." : "The coaches behind the progress.",
      body: "Add names, specialties, and a concise reason to trust the team.",
      layout: "grid",
      ctaLabel: "Edit team",
      ctaHref: "/admin",
      items: [
        {
          id: "staff-1",
          title: isSalon ? "Lead stylist" : "Head coach",
          description: isSalon ? "Color, finishing, and signature consultations." : "Strength, accountability, and habit coaching.",
          meta: "Add real staff details here",
          priceLabel: null,
          badge: null,
          image: null,
        },
        {
          id: "staff-2",
          title: isSalon ? "Skin specialist" : "Member success coach",
          description: isSalon ? "Routine care, facials, and treatment plans." : "Onboarding, retention, and routine building.",
          meta: "Add real staff details here",
          priceLabel: null,
          badge: null,
          image: null,
        },
      ],
      media: [],
    },
    {
      key: "gallery",
      enabled: true,
      label: "Gallery",
      eyebrow: isSalon ? "Inside the studio" : "Inside the space",
      headline: isSalon ? "A cleaner, calmer brand experience." : "A stronger training atmosphere from the first scroll.",
      body: "Gallery images can be swapped from the admin and published without touching code.",
      layout: "editorial",
      ctaLabel: isSalon ? "Book your visit" : "Book your first session",
      ctaHref: "/book",
      items: [],
      media: [heroImage, secondaryImage, thirdImage],
    },
    {
      key: "testimonials",
      enabled: true,
      label: "Testimonials",
      eyebrow: "Client proof",
      headline: isSalon ? "Why clients keep returning." : "Why members stay consistent.",
      body: "Trust-building proof blocks can be toggled on or off depending on the theme.",
      layout: "grid",
      ctaLabel: "See availability",
      ctaHref: "/book",
      items: isSalon
        ? [
            {
              id: "quote-1",
              title: "Best booking experience I've had",
              description: "The site was easy, the reminder landed on time, and I rebooked before leaving.",
              meta: "Returning client",
              priceLabel: null,
              badge: "Review",
              image: null,
            },
            {
              id: "quote-2",
              title: "The whole brand felt premium",
              description: "It felt like their own website, not a generic booking page.",
              meta: "New client",
              priceLabel: null,
              badge: "Review",
              image: null,
            },
          ]
        : [
            {
              id: "quote-1",
              title: "I booked the trial in under a minute",
              description: "The process felt sharp, and the follow-up kept me moving.",
              meta: "New member",
              priceLabel: null,
              badge: "Review",
              image: null,
            },
            {
              id: "quote-2",
              title: "The site made the gym feel serious",
              description: "Strong first impression, easy intro booking, no friction.",
              meta: "Member",
              priceLabel: null,
              badge: "Review",
              image: null,
            },
          ],
      media: [],
    },
    {
      key: "faq",
      enabled: true,
      label: "FAQ",
      eyebrow: "FAQ",
      headline: "Answer objections before they slow the booking.",
      body: "Use this block for parking, consultation, membership, cancellation, or trial details.",
      layout: "list",
      ctaLabel: "Contact us",
      ctaHref: "/contact",
      items: [
        {
          id: "faq-1",
          title: isSalon ? "How do I choose the right service?" : "Which offer should I start with?",
          description: isSalon
            ? "Start with the consultation or the service that best matches your current routine."
            : "Start with the trial or intro session and let the team guide the best next step.",
          meta: "",
          priceLabel: null,
          badge: null,
          image: null,
        },
        {
          id: "faq-2",
          title: "What happens after I book?",
          description: "The system sends confirmation instantly, then reminders and follow-ups based on the booking status.",
          meta: "",
          priceLabel: null,
          badge: null,
          image: null,
        },
      ],
      media: [],
    },
    {
      key: "memberships",
      enabled: true,
      label: "Memberships",
      eyebrow: isSalon ? "Memberships" : "Plans",
      headline: isSalon ? "Keep repeat appointments moving." : "Turn sessions into retained members.",
      body: isSalon
        ? "Feature routine care plans, prepaid packages, and VIP client perks."
        : "Feature your trial path, recurring membership, and premium coaching offer.",
      layout: "grid",
      ctaLabel: "View options",
      ctaHref: "/services",
      items: isSalon
        ? [
            {
              id: "membership-1",
              title: "Glow Membership",
              description: "Monthly facial plus priority scheduling.",
              meta: "Recurring revenue",
              priceLabel: "$129/mo",
              badge: "Popular",
              image: null,
            },
          ]
        : [
            {
              id: "membership-1",
              title: "Core Membership",
              description: "Gym access, intro programming, and member check-ins.",
              meta: "Best seller",
              priceLabel: "$79/mo",
              badge: "Popular",
              image: null,
            },
            {
              id: "membership-2",
              title: "Coaching Membership",
              description: "Membership plus recurring 1:1 coaching sessions.",
              meta: "High touch",
              priceLabel: "$199/mo",
              badge: "Premium",
              image: null,
            },
          ],
      media: [],
    },
    {
      key: "trust",
      enabled: true,
      label: "Trust",
      eyebrow: "Trust signals",
      headline: isSalon ? "Give clients more reasons to book now." : "Add authority before the trial decision.",
      body: "These blocks can showcase review count, average rating, certifications, or signature differentiators.",
      layout: "grid",
      ctaLabel: "Customize trust blocks",
      ctaHref: "/admin",
      items: [
        {
          id: "trust-1",
          title: isSalon ? "4.9 average rating" : "Trusted by local members",
          description: isSalon ? "Use real reviews, awards, or social proof." : "Use transformations, testimonials, or coach credentials.",
          meta: "Replace with your own proof",
          priceLabel: null,
          badge: "Trust",
          image: null,
        },
      ],
      media: [],
    },
    {
      key: "contact",
      enabled: true,
      label: "Contact",
      eyebrow: "Contact",
      headline: isSalon ? "Ask a question or book directly." : "Reach out, tour the space, or start a trial.",
      body: "The contact page doubles as a lead capture form so conversion metrics stay real.",
      layout: "split",
      ctaLabel: isSalon ? "Send inquiry" : "Start inquiry",
      ctaHref: "/contact",
      items: [],
      media: [secondaryImage],
    },
    {
      key: "cta",
      enabled: true,
      label: "CTA",
      eyebrow: "Ready",
      headline: isSalon ? "Book your next visit with a site that feels like your brand." : "Turn interest into booked sessions with a site built for action.",
      body: isSalon
        ? "Every edit in admin updates the brand, messaging, and booking flow without exposing Axora on the public site."
        : "Every theme, page, and CTA can be tailored in admin, then published under your own domain when ready.",
      layout: "stack",
      ctaLabel: isSalon ? "Book a consultation" : "Book intro session",
      ctaHref: "/book",
      items: [],
      media: [],
    },
  ];

  return {
    templateKey: themeKey,
    type: business.type,
    brand: {
      displayName: business.name,
      logoMark: initialsFromName(business.name),
      tagline: isSalon ? "Beauty routines, elevated." : "Coaching that keeps momentum high.",
      heroImage,
      faviconUrl: "",
      galleryImages: [heroImage, secondaryImage, thirdImage],
      socialLinks: {
        instagram: "",
        facebook: "",
        tiktok: "",
        youtube: "",
      },
    },
    theme,
    seo: {
      siteTitle: `${business.name} | ${isSalon ? "Salon Website" : "Gym Website"}`,
      siteDescription: isSalon
        ? `Book treatments, consultations, and repeat appointments with ${business.name}.`
        : `Book intro sessions, memberships, and coaching with ${business.name}.`,
      ogImage: heroImage,
      indexable: true,
    },
    contact: {
      email: business.supportEmail,
      phone: "+1 (555) 000-0000",
      address: isSalon ? "12 Studio Avenue, City Center" : "88 Training Lane, City Center",
      hours: [
        { label: "Mon-Fri", value: isSalon ? "9:00 AM - 7:00 PM" : "5:30 AM - 9:00 PM" },
        { label: "Sat", value: isSalon ? "10:00 AM - 6:00 PM" : "7:00 AM - 6:00 PM" },
        { label: "Sun", value: isSalon ? "11:00 AM - 4:00 PM" : "8:00 AM - 2:00 PM" },
      ],
    },
    booking: {
      headline: isSalon ? "Book a visit" : "Book your first session",
      body: isSalon
        ? "Choose a service and lock a time directly from the site."
        : "Choose the offer that fits and move from browsing to booking in one flow.",
      ctaLabel: isSalon ? "Book now" : "Book session",
      stickyLabel: isSalon ? "Book your visit" : "Start your trial",
      featuredServices: business.settings.services.slice(0, 3),
      showStickyMobile: true,
    },
    pages,
    sections,
  };
}

function buildPreviewVerification(hostname: string, platformRootDomain: string) {
  return {
    cnameName: hostname,
    cnameValue: `cname.${platformRootDomain}`,
    instructions: [
      `Point ${hostname} to the website layer on Vercel.`,
      `Use a CNAME record with value cname.${platformRootDomain}.`,
      "Publish after DNS is ready so the public site can resolve the hostname.",
    ],
    verificationToken: null,
  } satisfies WebsiteDomain["verification"];
}

function deepMergeSiteDraft(existing: WebsiteDraft, patch: WebsitePatch, fallbackTheme: WebsiteTheme): WebsiteDraft {
  const templateKey = patch.templateKey ?? existing.templateKey;
  const theme = patch.theme ?? (patch.templateKey ? fallbackTheme : existing.theme);
  return {
    ...existing,
    templateKey,
    theme,
    seo: patch.seo ?? existing.seo,
    brand: patch.brand ?? existing.brand,
    contact: patch.contact ?? existing.contact,
    booking: patch.booking ?? existing.booking,
    pages: patch.pages ?? existing.pages,
    sections: patch.sections ?? existing.sections,
  };
}

export class BookingService {
  private scheduler: Scheduler | null = null;

  constructor(
    private readonly repository: Repository,
    private readonly emailService: EmailService,
    private readonly appConfig: AppConfig,
    private readonly domainProvider: WebsiteDomainProvider | null = null,
  ) {}

  attachScheduler(scheduler: Scheduler) {
    this.scheduler = scheduler;
  }

  async ensureSeedData() {
    return;
  }

  async createBusiness(rawInput: BusinessCreateInput): Promise<BusinessCreateResult> {
    const input = businessCreateInputSchema.parse(rawInput);
    const slug = await this.generateUniqueSlug(input.name);
    const generatedPasscode = generatePasscode(input.type);
    const business = await this.repository.insertBusiness({
      name: input.name,
      slug,
      type: input.type,
      adminPasscodeHash: hashPasscode(generatedPasscode),
      supportEmail: this.appConfig.SUPPORT_EMAIL,
      settings: structuredClone(businessPresets[input.type]),
      currentPlan: "starter",
    });

    const templateKey = defaultThemeKeyByBusinessType[input.type];
    const draft = buildWebsiteDraft(business, templateKey);
    const siteConfig = await this.repository.createWebsiteConfig({
      businessId: business.id,
      templateKey,
      draft,
      published: draft,
      theme: draft.theme,
      seo: draft.seo,
    });

    await this.repository.insertWebsiteDomain({
      businessId: business.id,
      hostname: this.buildPreviewHostname(slug),
      kind: "preview",
      status: "active",
      verification: buildPreviewVerification(this.buildPreviewHostname(slug), this.appConfig.PLATFORM_ROOT_DOMAIN),
    });

    const identity = this.toBusinessIdentity(business, siteConfig);
    return {
      business: identity,
      generatedPasscode,
      bookingLink: identity.bookingLink,
      adminLink: identity.adminLink,
      previewSiteUrl: identity.previewSiteUrl,
      themeKey: identity.themeKey,
    };
  }

  async getPublicConfig(businessSlug: string): Promise<PublicConfig> {
    const bundle = await this.getBusinessBundleOrThrow(businessSlug);
    return {
      business: this.toBusinessIdentity(bundle.business, bundle.site),
      plans: planCatalog,
    };
  }

  async createLead(businessSlug: string, rawInput: LeadInput) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const input = leadInputSchema.parse(rawInput);
    return this.repository.insertLead({
      businessId: business.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: "public",
    });
  }

  async createBooking(businessSlug: string, rawInput: BookingInput) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const input = bookingInputSchema.parse(rawInput);
    const serviceName = this.resolveServiceName(input.service, business);
    const matchedLead = await this.repository.findOpenLeadForConversion(business.id, input.email, input.phone);

    const booking = await this.repository.insertBooking({
      businessId: business.id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      service: serviceName,
      scheduledAt: new Date(input.scheduledAt),
      source: matchedLead ? "lead" : "public",
    });

    if (matchedLead) {
      await this.repository.markLeadConverted(matchedLead.id, booking.id);
    }

    await this.sendAndLog("confirmation", booking, business);
    await this.scheduleReminder(booking, business);
    await this.scheduler?.notifyChange();
    return booking;
  }

  async loginBusinessAdmin(businessSlug: string, passcode: string) {
    const input = adminLoginSchema.parse({ passcode });
    const auth = await this.repository.getBusinessAuthBySlug(businessSlug);
    if (!auth || !verifyPasscode(input.passcode, auth.admin_passcode_hash)) {
      throw createHttpError(401, "Invalid admin passcode.");
    }

    return auth.slug;
  }

  async updateStatus(businessSlug: string, bookingId: string, statusInput: BookingStatus) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const status = bookingStatusSchema.parse(statusInput);
    const booking = await this.repository.updateBookingStatus(business.id, bookingId, status);
    if (!booking) {
      return null;
    }

    if (status === "completed") {
      await this.scheduleFollowUp(booking, business);
      await this.scheduler?.notifyChange();
    }

    return booking;
  }

  async getDashboard(businessSlug: string): Promise<DashboardPayload> {
    const bundle = await this.getBusinessBundleOrThrow(businessSlug);
    const snapshot = await this.repository.getDashboardSnapshot(bundle.business.id);
    if (!snapshot) {
      throw createHttpError(404, "Business not found.");
    }

    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const weekStart = startOfUtcWeek(now);
    const nextWeekStart = addDays(weekStart, 7);

    const bookingsToday = snapshot.bookings.filter((booking) => {
      const scheduledAt = new Date(booking.scheduledAt);
      return scheduledAt >= todayStart && scheduledAt < tomorrowStart;
    }).length;

    const bookingsThisWeek = snapshot.bookings.filter((booking) => {
      const scheduledAt = new Date(booking.scheduledAt);
      return scheduledAt >= weekStart && scheduledAt < nextWeekStart;
    }).length;

    const noShows = snapshot.bookings.filter((booking) => booking.status === "no_show").length;
    const convertedLeads = snapshot.leads.filter((lead) => lead.convertedBookingId).length;
    const totalLeads = snapshot.leads.length;
    const conversionRate = totalLeads === 0 ? 0 : convertedLeads / totalLeads;

    return {
      business: this.toBusinessIdentity(bundle.business, bundle.site),
      impact: {
        bookingsToday,
        bookingsThisWeek,
        noShows,
        conversionRate,
        conversionRateLabel: formatPercent(conversionRate),
      },
      leadSummary: {
        totalLeads,
        convertedLeads,
        openLeads: totalLeads - convertedLeads,
      },
      bookings: snapshot.bookings,
      activity: snapshot.activity,
      plans: snapshot.plans,
    };
  }

  async getSiteEditor(businessSlug: string): Promise<SiteEditorPayload> {
    const bundle = await this.getBusinessBundleOrThrow(businessSlug);
    const domains = await this.repository.listWebsiteDomains(bundle.business.id);
    return {
      business: this.toBusinessIdentity(bundle.business, bundle.site),
      site: bundle.site,
      domains,
      preview: {
        previewUrl: this.buildPreviewSiteUrl(bundle.business.slug),
        draftPreviewUrl: this.buildDraftPreviewUrl(bundle.business.slug, "draft"),
        publishedPreviewUrl: this.buildDraftPreviewUrl(bundle.business.slug, "published"),
        availableThemes: themePresetCatalog.filter((preset) => preset.type === bundle.business.type),
      },
    };
  }

  async updateSite(businessSlug: string, rawPatch: WebsitePatch) {
    const bundle = await this.getBusinessBundleOrThrow(businessSlug);
    const patch = websitePatchSchema.parse(rawPatch);
    if (patch.templateKey) {
      const meta = themePresetCatalog.find((preset) => preset.key === patch.templateKey);
      if (!meta || meta.type !== bundle.business.type) {
        throw createHttpError(400, "Theme preset does not match business type.");
      }
    }

    const nextTheme = themeForBusinessType(bundle.business.type, patch.templateKey ?? bundle.site.templateKey);
    const nextDraft = deepMergeSiteDraft(bundle.site.draft, patch, nextTheme);
    const updated = await this.repository.updateWebsiteDraft({
      businessId: bundle.business.id,
      templateKey: nextDraft.templateKey,
      draft: nextDraft,
      theme: nextDraft.theme,
      seo: nextDraft.seo,
    });

    if (!updated) {
      throw createHttpError(404, "Website configuration not found.");
    }

    return updated;
  }

  async publishSite(businessSlug: string) {
    const bundle = await this.getBusinessBundleOrThrow(businessSlug);
    const published = await this.repository.publishWebsite(bundle.business.id);
    if (!published) {
      throw createHttpError(404, "Website configuration not found.");
    }
    return published;
  }

  async addDomain(businessSlug: string, rawInput: { hostname: string }) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const input = websiteDomainCreateInputSchema.parse(rawInput);
    const hostname = sanitizeHostnameInput(input.hostname);
    const existing = await this.repository.getWebsiteDomainByHost(hostname);
    if (existing) {
      throw createHttpError(409, "That hostname is already connected to a business.");
    }

    const provisioned = this.domainProvider
      ? await this.domainProvider.createDomain(hostname)
      : {
          status: "pending_verification" as const,
          verification: {
            cnameName: hostname,
            cnameValue: this.appConfig.PLATFORM_ROOT_DOMAIN,
            instructions: [
              `Create a CNAME record for ${hostname} pointing to ${this.appConfig.PLATFORM_ROOT_DOMAIN}.`,
              "Wait for DNS to propagate, then verify the domain from the admin panel.",
            ],
            verificationToken: randomUUID(),
          },
        };

    return this.repository.insertWebsiteDomain({
      businessId: business.id,
      hostname,
      kind: "custom",
      status: provisioned.status,
      verification: provisioned.verification,
    });
  }

  async verifyDomain(businessSlug: string, rawInput: { domainId: string }) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const input = websiteDomainVerifyInputSchema.parse(rawInput);
    const domain = await this.repository.getWebsiteDomainById(business.id, input.domainId);
    if (!domain) {
      throw createHttpError(404, "Domain not found.");
    }

    if (domain.kind === "preview") {
      return this.repository.updateWebsiteDomainStatus(business.id, domain.id, "active");
    }

    if (this.domainProvider) {
      const verified = await this.domainProvider.verifyDomain(domain.hostname);
      return this.repository.updateWebsiteDomainStatus(business.id, domain.id, verified.status, verified.verification);
    }

    return this.repository.updateWebsiteDomainStatus(business.id, domain.id, "active");
  }

  async deleteDomain(businessSlug: string, domainId: string) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const domain = await this.repository.getWebsiteDomainById(business.id, domainId);
    if (!domain) {
      return false;
    }
    if (domain.kind === "preview") {
      throw createHttpError(400, "Preview domains cannot be removed.");
    }

    if (this.domainProvider) {
      await this.domainProvider.removeDomain(domain.hostname);
    }

    return this.repository.deleteWebsiteDomain(business.id, domainId);
  }

  async resolveSite(input: { host?: string; slug?: string; state?: PreviewState }): Promise<ResolvedWebsite> {
    const state = input.state ?? "published";

    if (input.slug) {
      const bundle = await this.getBusinessBundleOrThrow(input.slug);
      return {
        business: this.toBusinessIdentity(bundle.business, bundle.site),
        site: state === "draft" ? bundle.site.draft : bundle.site.published,
        domain: (await this.repository.listWebsiteDomains(bundle.business.id)).find((domain) => domain.kind === "preview") ?? null,
        state,
        plans: planCatalog,
      };
    }

    if (!input.host) {
      throw createHttpError(400, "A host or business slug is required.");
    }

    const domain = await this.repository.getWebsiteDomainByHost(sanitizeHost(input.host));
    if (!domain || domain.status === "error") {
      throw createHttpError(404, "Website not found.");
    }

    const business = await this.repository.getBusinessById(domain.businessId);
    const site = await this.repository.getWebsiteConfigByBusinessId(domain.businessId);
    if (!business || !site) {
      throw createHttpError(404, "Website not found.");
    }

    return {
      business: this.toBusinessIdentity(business, site),
      site: state === "draft" ? site.draft : site.published,
      domain,
      state,
      plans: planCatalog,
    };
  }

  async uploadSiteAsset(_businessSlug: string, rawInput: unknown): Promise<WebsiteAssetUploadResult> {
    const input = websiteAssetUploadSchema.parse(rawInput);
    if (!this.appConfig.SUPABASE_URL || !this.appConfig.SUPABASE_SERVICE_ROLE_KEY) {
      throw createHttpError(501, "Supabase Storage is not configured.");
    }

    const bytes = Buffer.from(input.dataBase64, "base64");
    const safeName = `${Date.now()}-${slugify(input.fileName)}`;
    const path = `site-assets/${safeName}`;
    const uploadUrl = `${this.appConfig.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${this.appConfig.SUPABASE_STORAGE_BUCKET}/${path}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.appConfig.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: this.appConfig.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": input.contentType,
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!response.ok) {
      const payload = await response.text();
      throw createHttpError(502, `Asset upload failed: ${payload || response.statusText}`);
    }

    const publicUrl = `${this.appConfig.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${this.appConfig.SUPABASE_STORAGE_BUCKET}/${path}`;
    return { url: publicUrl, path };
  }

  async handleJob(job: Pick<PendingJob, "booking_id" | "business_id" | "type">) {
    const booking = await this.repository.getBookingById(job.booking_id);
    if (!booking) {
      return;
    }

    const business = await this.repository.getBusinessById(job.business_id);
    if (!business) {
      return;
    }

    switch (job.type) {
      case "reminder":
        if (booking.status === "cancelled" || booking.status === "no_show") {
          await this.logSkipped("reminder", booking, business, "Reminder skipped because booking is inactive.");
          return;
        }
        await this.sendAndLog("reminder", booking, business);
        return;
      case "follow_up":
        if (booking.status !== "completed") {
          await this.logSkipped("follow_up", booking, business, "Follow-up skipped because booking is not completed.");
          return;
        }
        await this.sendAndLog("follow_up", booking, business);
        await this.scheduleReengagement(booking, business);
        await this.scheduler?.notifyChange();
        return;
      case "reengagement":
        if (booking.status !== "completed") {
          await this.logSkipped("reengagement", booking, business, "Re-engagement skipped because booking is not completed.");
          return;
        }
        await this.sendAndLog("reengagement", booking, business);
        return;
      default:
        return;
    }
  }

  private async generateUniqueSlug(name: string) {
    const base = slugify(name);
    let candidate = base;
    let counter = 2;

    while (await this.repository.slugExists(candidate)) {
      candidate = `${base}-${counter}`;
      counter += 1;
    }

    return candidate;
  }

  private async getBusinessOrThrow(businessSlug: string) {
    const business = await this.repository.getBusinessBySlug(businessSlug);
    if (!business) {
      throw createHttpError(404, "Business not found.");
    }
    return business;
  }

  private async getBusinessBundleOrThrow(businessSlug: string) {
    const business = await this.getBusinessOrThrow(businessSlug);
    const site = await this.repository.getWebsiteConfigByBusinessId(business.id);
    if (!site) {
      throw createHttpError(404, "Website configuration not found.");
    }
    return { business, site };
  }

  private toBusinessIdentity(business: Business, site: WebsiteConfig): BusinessIdentity {
    const previewSiteUrl = this.buildPreviewSiteUrl(business.slug);
    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      type: business.type,
      currentPlan: business.currentPlan,
      supportEmail: business.supportEmail,
      services: [...business.settings.services],
      settings: business.settings,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      bookingLink: `${previewSiteUrl.replace(/\/$/, "")}/book`,
      adminLink: `${this.appConfig.CLIENT_ORIGIN.replace(/\/$/, "")}/admin/${business.slug}`,
      previewSiteUrl,
      themeKey: site.templateKey,
    };
  }

  private resolveServiceName(service: string, business: Business) {
    const match = business.settings.services.find(
      (candidate) => candidate.toLowerCase() === service.trim().toLowerCase(),
    );

    if (!match) {
      throw createHttpError(400, `Service "${service}" is not available for ${business.name}.`);
    }

    return match;
  }

  private buildPreviewHostname(slug: string) {
    return `${slug}.${this.appConfig.PLATFORM_ROOT_DOMAIN}`.toLowerCase();
  }

  private buildPreviewSiteUrl(slug: string) {
    const websiteOrigin = this.appConfig.WEBSITE_ORIGIN.replace(/\/$/, "");
    return `${websiteOrigin}${buildPreviewPath(slug)}`;
  }

  private buildDraftPreviewUrl(slug: string, state: PreviewState) {
    const websiteOrigin = this.appConfig.WEBSITE_ORIGIN.replace(/\/$/, "");
    return `${websiteOrigin}${buildPreviewPath(slug)}?state=${state}`;
  }

  private async scheduleReminder(booking: Booking, business: Business) {
    const reminderAt = addHours(new Date(booking.scheduledAt), -business.settings.reminderHours);
    if (reminderAt.getTime() <= Date.now()) {
      return;
    }

    await this.repository.ensurePendingJob(business.id, booking.id, "reminder", reminderAt);
  }

  private async scheduleFollowUp(booking: Booking, business: Business) {
    const start = booking.completedAt ? new Date(booking.completedAt) : new Date();
    const runAt = addHours(start, business.settings.followUpHours);
    await this.repository.ensurePendingJob(business.id, booking.id, "follow_up", runAt);
  }

  private async scheduleReengagement(booking: Booking, business: Business) {
    const runAt = addDays(new Date(), business.settings.reengagementDays);
    await this.repository.ensurePendingJob(business.id, booking.id, "reengagement", runAt);
  }

  private async sendAndLog(kind: MessageKind, booking: Booking, business: Business) {
    const delivery = await this.emailService.send(kind, booking, {
      businessName: business.name,
      businessType: business.type,
    });
    await this.repository.upsertMessageLog({
      businessId: business.id,
      bookingId: booking.id,
      kind,
      deliveryMode: delivery.deliveryMode,
      status: delivery.status,
      subject: delivery.subject,
      toEmail: booking.email,
      sentAt: delivery.status === "sent" ? new Date() : null,
      providerMessageId: delivery.providerMessageId ?? null,
      error: delivery.error ?? null,
    });
  }

  private async logSkipped(kind: MessageKind, booking: Booking, business: Business, reason: string) {
    await this.repository.upsertMessageLog({
      businessId: business.id,
      bookingId: booking.id,
      kind,
      deliveryMode: this.appConfig.EMAIL_MODE,
      status: "skipped",
      subject: `${business.name} skipped ${kind.replace("_", " ")}`,
      toEmail: booking.email,
      sentAt: null,
      error: reason,
    });
  }
}
