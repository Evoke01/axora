# Axora

Axora is a business onboarding, booking automation, and white-label website generator for salons and gyms.

When a business is created, Axora now provisions:

- a business slug
- a business-specific admin passcode
- a preview website
- a business-scoped booking flow
- a website draft with theme, content, pages, SEO, and domain records
- an admin dashboard with conversion and booking impact metrics

The public website is not the Axora UI with swapped copy. It renders as the customer's own branded salon or gym site from structured website config.

## Architecture

- `client/`
  - Axora product shell on React + Vite
  - landing page
  - onboarding flow at `/start`
  - admin CMS at `/admin/:businessSlug`
- `server/`
  - Express API
  - business creation and booking flows
  - lead and booking storage
  - delayed reminder/follow-up/re-engagement scheduler
  - website draft, publish, domain, and site resolve APIs
- `shared/`
  - Zod schemas and shared contracts for business, dashboard, and website config
- `website/`
  - Next.js public website runtime
  - preview route for admin review
  - hostname-based rendering for preview/custom domains
  - embedded booking widget and lead capture

## Routes

### Axora shell

- `/`
- `/start`
- `/admin/:businessSlug`

### API

- `POST /api/businesses`
- `GET /api/public-config/:businessSlug`
- `POST /api/leads/:businessSlug`
- `POST /api/bookings/:businessSlug`
- `POST /api/admin/:businessSlug/login`
- `GET /api/admin/:businessSlug/dashboard`
- `GET /api/admin/:businessSlug/site`
- `PATCH /api/admin/:businessSlug/site`
- `POST /api/admin/:businessSlug/site/publish`
- `POST /api/admin/:businessSlug/site/assets`
- `POST /api/admin/:businessSlug/domains`
- `POST /api/admin/:businessSlug/domains/verify`
- `DELETE /api/admin/:businessSlug/domains/:domainId`
- `GET /api/sites/resolve`
- `GET /api/health`

### Website runtime

- `/:page`
  - resolved by hostname in production
- `/book`
  - full-page booking fallback
- `/preview/:businessSlug`
  - draft/published preview route for local dev and admin iframe usage
  - this is also the default free-tier preview entrypoint on Vercel when wildcard subdomains are not configured

## Local development

1. Copy the env templates you need:
   - root server env: `.env.example`
   - Axora shell env: `client/.env.example`
   - website runtime env: `website/.env.example`
2. Set `DATABASE_URL` to Postgres or Supabase Postgres.
3. Install dependencies:

```bash
npm install
```

4. Start all workspaces:

```bash
npm run dev
```

This runs:

- shared watcher
- Express API on `http://localhost:4000`
- Axora shell on `http://localhost:5173`
- website runtime on `http://localhost:3000`

## Deployment shape

### Render

Render hosts the Express API and serves the built Axora shell.

- service: `render.yaml`
- build command:
  - `npm install && npm run build --workspace shared && npm run build --workspace server && npm run build --workspace client`
- start command:
  - `npm run start`
- health check:
  - `/api/health`

Required server envs:

- `DATABASE_URL`
- `CLIENT_ORIGIN`
- `WEBSITE_ORIGIN`
- `PLATFORM_ROOT_DOMAIN`
- `APP_BASE_URL`
- `SESSION_SECRET`
- `EMAIL_MODE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SUPPORT_EMAIL`

Optional upload envs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`
- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` or `VERCEL_TEAM_SLUG`

### Vercel

Vercel hosts the `website/` workspace as its own Next.js project.

- project root directory:
  - `website`
- required envs:
  - `API_ORIGIN`
  - `NEXT_PUBLIC_API_URL`

Preview/custom domains should target the website project, not the Render API service.

If you add `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` to the Render API service, Axora can also sync custom-domain add, verify, and remove actions against the live Vercel website project instead of only storing the domain locally.

## Free-tier notes

- Render Free is still best-effort for delayed jobs because the scheduler is in-process and the service can sleep.
- Supabase Free is used as Postgres and optionally Storage.
- Supabase publishable keys are enough for public client config, but server-side media uploads still require `SUPABASE_SERVICE_ROLE_KEY`.
- Resend Free is used for email.
- Vercel can host the website workspace separately from the Axora admin/API stack.

## Scripts

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run dev:website
npm run build
npm run build:website
npm run build:all
npm test
```
