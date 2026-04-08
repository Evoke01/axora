import { z } from "zod";

export const businessTypeValues = ["salon", "gym"] as const;
export const bookingStatusValues = ["confirmed", "completed", "cancelled", "no_show"] as const;
export const jobTypeValues = ["reminder", "follow_up", "reengagement"] as const;
export const emailModeValues = ["demo", "live"] as const;
export const messageKindValues = ["confirmation", "reminder", "follow_up", "reengagement"] as const;
export const messageStatusValues = ["sent", "failed", "skipped"] as const;
export const bookingSourceValues = ["public", "lead", "seed"] as const;
export const leadStatusValues = ["new", "converted"] as const;
export const leadSourceValues = ["public", "seed"] as const;
export const planTierValues = ["starter", "pro"] as const;
export const pageKeyValues = ["home", "services", "about", "gallery", "contact"] as const;
export const sectionKeyValues = [
  "announcement",
  "hero",
  "offers",
  "services",
  "about",
  "staff",
  "gallery",
  "testimonials",
  "faq",
  "memberships",
  "trust",
  "contact",
  "cta",
] as const;
export const sectionLayoutValues = ["split", "grid", "list", "editorial", "stack"] as const;
export const buttonStyleValues = ["pill", "soft-square", "outline"] as const;
export const cornerStyleValues = ["rounded", "organic", "sharp"] as const;
export const sectionSpacingValues = ["compact", "comfortable", "airy"] as const;
export const siteDomainKindValues = ["preview", "custom"] as const;
export const siteDomainStatusValues = ["active", "pending_verification", "error"] as const;
export const previewStateValues = ["draft", "published"] as const;
export const themePresetValues = [
  "salon-editorial",
  "salon-premium-beauty",
  "salon-soft-luxury",
  "gym-performance",
  "gym-coaching",
  "gym-membership",
] as const;

export const businessTypeSchema = z.enum(businessTypeValues);
export const bookingStatusSchema = z.enum(bookingStatusValues);
export const jobTypeSchema = z.enum(jobTypeValues);
export const emailModeSchema = z.enum(emailModeValues);
export const messageKindSchema = z.enum(messageKindValues);
export const messageStatusSchema = z.enum(messageStatusValues);
export const bookingSourceSchema = z.enum(bookingSourceValues);
export const leadStatusSchema = z.enum(leadStatusValues);
export const leadSourceSchema = z.enum(leadSourceValues);
export const planTierSchema = z.enum(planTierValues);
export const pageKeySchema = z.enum(pageKeyValues);
export const sectionKeySchema = z.enum(sectionKeyValues);
export const sectionLayoutSchema = z.enum(sectionLayoutValues);
export const buttonStyleSchema = z.enum(buttonStyleValues);
export const cornerStyleSchema = z.enum(cornerStyleValues);
export const sectionSpacingSchema = z.enum(sectionSpacingValues);
export const siteDomainKindSchema = z.enum(siteDomainKindValues);
export const siteDomainStatusSchema = z.enum(siteDomainStatusValues);
export const previewStateSchema = z.enum(previewStateValues);
export const themePresetSchema = z.enum(themePresetValues);

export const businessSettingsSchema = z.object({
  services: z.array(z.string().trim().min(2).max(80)).min(1),
  reminderHours: z.number().nonnegative(),
  followUpHours: z.number().nonnegative(),
  reengagementDays: z.number().nonnegative(),
  leadHeadline: z.string(),
  leadDescription: z.string(),
  bookingHeadline: z.string(),
  bookingDescription: z.string(),
  dashboardCopy: z.string(),
  kpiExample: z.object({
    leads: z.number().int().nonnegative(),
    bookings: z.number().int().nonnegative(),
    conversionLabel: z.string(),
  }),
});

export const businessCreateInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: businessTypeSchema,
});

export const leadInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(24),
});

export const bookingInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8).max(24),
  service: z.string().trim().min(2).max(80),
  scheduledAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date/time"),
});

export const adminLoginSchema = z.object({
  passcode: z.string().trim().min(1),
});

export const themePresetMetaSchema = z.object({
  key: themePresetSchema,
  label: z.string(),
  type: businessTypeSchema,
  description: z.string(),
  mood: z.string(),
});

export const websiteThemeSchema = z.object({
  presetKey: themePresetSchema,
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  mutedText: z.string(),
  cardSurface: z.string(),
  borderColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
  buttonStyle: buttonStyleSchema,
  cornerStyle: cornerStyleSchema,
  sectionSpacing: sectionSpacingSchema,
});

export const websiteSocialLinksSchema = z.object({
  instagram: z.string(),
  facebook: z.string(),
  tiktok: z.string(),
  youtube: z.string(),
});

export const websiteBrandSchema = z.object({
  displayName: z.string(),
  logoMark: z.string(),
  tagline: z.string(),
  heroImage: z.string(),
  faviconUrl: z.string(),
  galleryImages: z.array(z.string()),
  socialLinks: websiteSocialLinksSchema,
});

export const websiteHourSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const websiteContactSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  hours: z.array(websiteHourSchema),
});

export const websiteSectionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  meta: z.string(),
  priceLabel: z.string().nullable(),
  badge: z.string().nullable(),
  image: z.string().nullable(),
});

export const websiteSectionSchema = z.object({
  key: sectionKeySchema,
  enabled: z.boolean(),
  label: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  body: z.string(),
  layout: sectionLayoutSchema,
  ctaLabel: z.string(),
  ctaHref: z.string(),
  items: z.array(websiteSectionItemSchema),
  media: z.array(z.string()),
});

export const websitePageSchema = z.object({
  key: pageKeySchema,
  label: z.string(),
  slug: z.string(),
  enabled: z.boolean(),
  intro: z.string(),
  sections: z.array(sectionKeySchema),
});

export const bookingEmbedSettingsSchema = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  stickyLabel: z.string(),
  featuredServices: z.array(z.string()),
  showStickyMobile: z.boolean(),
});

export const websiteSeoSchema = z.object({
  siteTitle: z.string(),
  siteDescription: z.string(),
  ogImage: z.string(),
  indexable: z.boolean(),
});

export const websiteDraftSchema = z.object({
  templateKey: themePresetSchema,
  type: businessTypeSchema,
  brand: websiteBrandSchema,
  theme: websiteThemeSchema,
  seo: websiteSeoSchema,
  contact: websiteContactSchema,
  booking: bookingEmbedSettingsSchema,
  pages: z.array(websitePageSchema),
  sections: z.array(websiteSectionSchema),
});

export const websitePublishedSchema = websiteDraftSchema;

export const websiteConfigSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  templateKey: themePresetSchema,
  theme: websiteThemeSchema,
  seo: websiteSeoSchema,
  draft: websiteDraftSchema,
  published: websitePublishedSchema,
  publishVersion: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const websiteDomainVerificationSchema = z.object({
  cnameName: z.string(),
  cnameValue: z.string(),
  instructions: z.array(z.string()),
  verificationToken: z.string().nullable(),
});

export const websiteDomainSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  hostname: z.string(),
  kind: siteDomainKindSchema,
  status: siteDomainStatusSchema,
  verification: websiteDomainVerificationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const websitePatchSchema = z.object({
  templateKey: themePresetSchema.optional(),
  theme: websiteThemeSchema.optional(),
  seo: websiteSeoSchema.optional(),
  brand: websiteBrandSchema.optional(),
  contact: websiteContactSchema.optional(),
  booking: bookingEmbedSettingsSchema.optional(),
  pages: z.array(websitePageSchema).optional(),
  sections: z.array(websiteSectionSchema).optional(),
});

export const websiteDomainCreateInputSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
});

export const websiteDomainVerifyInputSchema = z.object({
  domainId: z.string(),
});

export const websiteAssetUploadSchema = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  dataBase64: z.string().trim().min(1),
});

export const websiteAssetUploadResultSchema = z.object({
  url: z.string(),
  path: z.string(),
});

export const businessCoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  type: businessTypeSchema,
  currentPlan: planTierSchema,
  supportEmail: z.string().email(),
  services: z.array(z.string()),
  settings: businessSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const businessIdentitySchema = businessCoreSchema.extend({
  bookingLink: z.string(),
  adminLink: z.string(),
  previewSiteUrl: z.string(),
  themeKey: themePresetSchema,
});

export const businessSchema = businessCoreSchema;

export const businessCreateResultSchema = z.object({
  business: businessIdentitySchema,
  generatedPasscode: z.string(),
  bookingLink: z.string(),
  adminLink: z.string(),
  previewSiteUrl: z.string(),
  themeKey: themePresetSchema,
});

export const leadSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  status: leadStatusSchema,
  source: leadSourceSchema,
  convertedBookingId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bookingSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  service: z.string(),
  scheduledAt: z.string(),
  status: bookingStatusSchema,
  source: bookingSourceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const messageLogSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  bookingId: z.string(),
  kind: messageKindSchema,
  deliveryMode: emailModeSchema,
  status: messageStatusSchema,
  subject: z.string(),
  toEmail: z.string(),
  sentAt: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

export const planSchema = z.object({
  tier: planTierSchema,
  label: z.string(),
  priceLabel: z.string(),
  bookingLimit: z.number(),
  automationLimit: z.number(),
  features: z.array(z.string()),
  lockedFeatures: z.array(z.string()),
  highlight: z.string(),
});

export const impactMetricsSchema = z.object({
  bookingsToday: z.number().int().nonnegative(),
  bookingsThisWeek: z.number().int().nonnegative(),
  noShows: z.number().int().nonnegative(),
  conversionRate: z.number().nonnegative(),
  conversionRateLabel: z.string(),
});

export const leadSummarySchema = z.object({
  totalLeads: z.number().int().nonnegative(),
  convertedLeads: z.number().int().nonnegative(),
  openLeads: z.number().int().nonnegative(),
});

export const dashboardSchema = z.object({
  business: businessIdentitySchema,
  impact: impactMetricsSchema,
  leadSummary: leadSummarySchema,
  bookings: z.array(bookingSchema),
  activity: z.array(messageLogSchema),
  plans: z.array(planSchema),
});

export const publicConfigSchema = z.object({
  business: businessIdentitySchema,
  plans: z.array(planSchema),
});

export const siteEditorPayloadSchema = z.object({
  business: businessIdentitySchema,
  site: websiteConfigSchema,
  domains: z.array(websiteDomainSchema),
  preview: z.object({
    previewUrl: z.string(),
    draftPreviewUrl: z.string(),
    publishedPreviewUrl: z.string(),
    availableThemes: z.array(themePresetMetaSchema),
  }),
});

export const resolvedWebsiteSchema = z.object({
  business: businessIdentitySchema,
  site: websitePublishedSchema,
  domain: websiteDomainSchema.nullable(),
  state: previewStateSchema,
  plans: z.array(planSchema),
});

export const planCatalog = [
  {
    tier: "starter" as const,
    label: "Starter",
    priceLabel: "$29/mo",
    bookingLimit: 150,
    automationLimit: 3,
    features: [
      "Lead capture and booking pages",
      "Impact dashboard with conversion metrics",
      "Confirmation, reminder, and follow-up emails",
      "White-label site with one preview subdomain",
    ],
    lockedFeatures: ["Custom domain publishing", "SMS and WhatsApp", "Calendar sync"],
    highlight: "Launch a business funnel that proves revenue impact fast.",
  },
  {
    tier: "pro" as const,
    label: "Pro",
    priceLabel: "$99/mo",
    bookingLimit: 1000,
    automationLimit: 12,
    features: [
      "Everything in Starter",
      "Higher automation capacity",
      "Priority support and wrapper-site rollout",
      "Custom domain and richer design control",
    ],
    lockedFeatures: [],
    highlight: "Built for operators who want higher volume and sharper reporting.",
  },
];

export const businessPresets = {
  salon: {
    services: ["haircut", "facial", "hair spa"],
    reminderHours: 24,
    followUpHours: 24,
    reengagementDays: 7,
    leadHeadline: "Turn salon inquiries into booked appointments.",
    leadDescription: "Collect warm leads first, then move them into bookings so the owner can see conversion in plain numbers.",
    bookingHeadline: "Book your next salon visit.",
    bookingDescription: "Choose a service, lock a time, and trigger the automation flow automatically.",
    dashboardCopy: "See how many inquiries turned into appointments this week and where no-shows are costing money.",
    kpiExample: {
      leads: 50,
      bookings: 20,
      conversionLabel: "40%",
    },
  },
  gym: {
    services: ["monthly membership", "personal training", "trial session"],
    reminderHours: 24,
    followUpHours: 24,
    reengagementDays: 14,
    leadHeadline: "Convert gym inquiries into memberships and sessions.",
    leadDescription: "Capture every interested visitor, then measure how many actually become paying bookings.",
    bookingHeadline: "Book your gym session or membership consult.",
    bookingDescription: "Let prospects move from interest to a confirmed slot without losing the trail.",
    dashboardCopy: "Track how many leads became booked sessions, where no-shows happened, and what that means for weekly growth.",
    kpiExample: {
      leads: 50,
      bookings: 20,
      conversionLabel: "40%",
    },
  },
} satisfies Record<BusinessType, BusinessSettings>;

export const themePresetCatalog = [
  {
    key: "salon-editorial",
    label: "Editorial",
    type: "salon",
    description: "An art-forward salon site with a polished editorial pace.",
    mood: "dark editorial luxury",
  },
  {
    key: "salon-premium-beauty",
    label: "Premium Beauty",
    type: "salon",
    description: "A luminous beauty brand feel with service-first conversion blocks.",
    mood: "bright premium beauty",
  },
  {
    key: "salon-soft-luxury",
    label: "Soft Luxury",
    type: "salon",
    description: "A softer, calmer salon presentation for premium self-care brands.",
    mood: "warm luxury retreat",
  },
  {
    key: "gym-performance",
    label: "Performance",
    type: "gym",
    description: "A bold performance site built around training and results.",
    mood: "kinetic performance",
  },
  {
    key: "gym-coaching",
    label: "Coaching Studio",
    type: "gym",
    description: "A focused coaching-led layout for personal training businesses.",
    mood: "high-accountability coaching",
  },
  {
    key: "gym-membership",
    label: "Membership Club",
    type: "gym",
    description: "A modern fitness membership site with clear join and trial paths.",
    mood: "community fitness club",
  },
] satisfies ThemePresetMeta[];

export const defaultThemeKeyByBusinessType = {
  salon: "salon-editorial",
  gym: "gym-performance",
} satisfies Record<BusinessType, ThemePreset>;

export type BusinessType = z.infer<typeof businessTypeSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type EmailMode = z.infer<typeof emailModeSchema>;
export type MessageKind = z.infer<typeof messageKindSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type LeadSource = z.infer<typeof leadSourceSchema>;
export type BookingSource = z.infer<typeof bookingSourceSchema>;
export type PageKey = z.infer<typeof pageKeySchema>;
export type SectionKey = z.infer<typeof sectionKeySchema>;
export type ThemePreset = z.infer<typeof themePresetSchema>;
export type PreviewState = z.infer<typeof previewStateSchema>;

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
export type BusinessCreateInput = z.infer<typeof businessCreateInputSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type ThemePresetMeta = z.infer<typeof themePresetMetaSchema>;
export type WebsiteTheme = z.infer<typeof websiteThemeSchema>;
export type WebsiteBrand = z.infer<typeof websiteBrandSchema>;
export type WebsiteContact = z.infer<typeof websiteContactSchema>;
export type WebsiteSectionItem = z.infer<typeof websiteSectionItemSchema>;
export type WebsiteSection = z.infer<typeof websiteSectionSchema>;
export type WebsitePage = z.infer<typeof websitePageSchema>;
export type BookingEmbedSettings = z.infer<typeof bookingEmbedSettingsSchema>;
export type WebsiteSeo = z.infer<typeof websiteSeoSchema>;
export type WebsiteDraft = z.infer<typeof websiteDraftSchema>;
export type WebsitePublished = z.infer<typeof websitePublishedSchema>;
export type WebsiteConfig = z.infer<typeof websiteConfigSchema>;
export type WebsiteDomain = z.infer<typeof websiteDomainSchema>;
export type WebsitePatch = z.infer<typeof websitePatchSchema>;
export type WebsiteDomainCreateInput = z.infer<typeof websiteDomainCreateInputSchema>;
export type WebsiteDomainVerifyInput = z.infer<typeof websiteDomainVerifyInputSchema>;
export type WebsiteAssetUploadInput = z.infer<typeof websiteAssetUploadSchema>;
export type WebsiteAssetUploadResult = z.infer<typeof websiteAssetUploadResultSchema>;
export type Business = z.infer<typeof businessSchema>;
export type BusinessIdentity = z.infer<typeof businessIdentitySchema>;
export type BusinessCreateResult = z.infer<typeof businessCreateResultSchema>;
export type Lead = z.infer<typeof leadSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type MessageLog = z.infer<typeof messageLogSchema>;
export type Plan = z.infer<typeof planSchema>;
export type ImpactMetrics = z.infer<typeof impactMetricsSchema>;
export type LeadSummary = z.infer<typeof leadSummarySchema>;
export type DashboardPayload = z.infer<typeof dashboardSchema>;
export type PublicConfig = z.infer<typeof publicConfigSchema>;
export type SiteEditorPayload = z.infer<typeof siteEditorPayloadSchema>;
export type ResolvedWebsite = z.infer<typeof resolvedWebsiteSchema>;
