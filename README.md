# Reno Stack

![Reno Stack Banner](https://raw.githubusercontent.com/kasraghoreyshi/kasraghoreyshi/refs/heads/main/banner.jpg)

> **CSR-focused • Self-hostable • Opinionated**

Reno Stack is a modern web app starter kit designed for speed, efficiency, and self-hosting.

## 🚀 Features

- ⚛️ **React App with Vite** – Fast and reliable
- 🚦 **Tanstack Router** – File-based routing
- 🔐 **Better-Auth** – Simple authentication
- 🎨 **Tailwind + Shadcn** – Quick UI building
- 🔗 **Type-safe DX** – End-to-end type safety
- 🛠️ **Self-hostable** – Everything is self-hostable
- 🧩 **Drizzle ORM** – Modern, type-safe ORM
- 📦 **PNPM** – Efficient package management

## Project Structure

```text
.vscode
  └─ VSCode settings
apps
  ├─ server
  |   ├─ Hono on Cloudflare Workers
  |   ├─ D1 (SQLite) with Drizzle ORM
  |   └─ Authentication with Better-Auth
  └─ web
      ├─ React
      ├─ Vite
      ├─ Tailwind CSS
      ├─ React Hook Form
      ├─ React Query with custom Hono RPC
      └─ File-based routing with Tanstack Router
packages
  ├─ ui
  |   └─ UI components with Shadcn
  └─ validators
      └─ Shared Zod schemas
```

## Quick Start

Before diving in, it's recommended to read the sections below for a better understanding of the stack. Here's how to run the example app:

| Command | Description |
| ------- | ----------- |
| `pnpm i` | Install dependencies |
| Create D1 DB | From repo root: `cd apps/server && pnpm wrangler d1 create reno-stack-db` |
| Bind D1 | Copy the `database_id` from the output into `apps/server/wrangler.toml` under `[[d1_databases]]` (replace `REPLACE_WITH_D1_DATABASE_ID`) |
| Apply migrations | `cd apps/server && pnpm db:migrate:local` (local) or `pnpm db:migrate:remote` (remote) |
| Set secrets | `cp apps/server/.dev.vars.example apps/server/.dev.vars` and fill in `BETTER_AUTH_SECRET`, Discord keys, etc. |

Create a Discord application in the [Discord developer portal](https://discord.com/developers/applications). Go to your created application and add the **exact** redirect URIs to `Redirects` in `OAuth2` settings (one per environment):

- **Local:** `http://localhost:8787/api/auth/callback/discord`
- **Production:** your API URL + `/api/auth/callback/discord` (e.g. `https://pk-pocket-cube-api-prod.castellon.workers.dev/api/auth/callback/discord`)

Add `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` to `apps/server/.dev.vars` (and production secrets for prod). The server runs on **Cloudflare Workers**; local dev uses `pnpm dev` in `apps/server` (Worker URL is `http://localhost:8787`). Set `VITE_SERVER_URL=http://localhost:8787` in `.dev.vars` so the web app talks to the Worker.

### Production login: “get-session is null” / session cookie not sent

If the callback sets a cookie (`hasSetCookie: true` in logs) but later get-session requests have `hasCookieHeader: false`, the browser is **not sending** the session cookie. That happens when the API and frontend are on **different registrable domains** (e.g. API at `*.workers.dev`, frontend at `pocket.castellon.dev`): the cookie is treated as **third-party** and many browsers block or restrict it.

**Fix: serve the API from the same site as the frontend** (e.g. a subdomain of your app domain):

1. **Add a custom domain to the Worker** so the API is on the same domain as the frontend (e.g. `api.pocket.castellon.dev`):
   - Cloudflare Dashboard → Workers & Pages → your worker (`pk-pocket-cube-api-prod`) → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → e.g. `api.pocket.castellon.dev` (the zone for `pocket.castellon.dev` must be on the same Cloudflare account).
2. **Set production env** so the app and Discord use that URL:
   - In **wrangler.toml** `[env.prod.vars]`: set `VITE_SERVER_URL = "https://api.pocket.castellon.dev"` (or your chosen hostname).
   - In **Discord** OAuth2 Redirects: add `https://api.pocket.castellon.dev/api/auth/callback/discord` (and remove the `*.workers.dev` one if you no longer use it).
3. **Redeploy** the worker and ensure the frontend is built with `VITE_SERVER_URL=https://api.pocket.castellon.dev` for production.

Then the session cookie is **first-party** (same site as the page), and get-session should receive it.

Visit `http://localhost:5173` to start building! 🚀

![Example App Screenshot](https://raw.githubusercontent.com/kasraghoreyshi/kasraghoreyshi/refs/heads/main/example-app.png)

## Type-safety

Reno Stack uses Hono RPC and React Query in a relatively unique way. React Query has a feature called [QueryOptions](https://tanstack.com/query/latest/docs/framework/react/guides/query-options) which is basically for creating reusable `queryFn` and `queryKey`s. By taking advantage of this, we've made a [custom utility](https://github.com/reno-stack/hono-react-query) that couples extremely well with Hono RPC. This utility gives you two functions called `createHonoQueryOptions` and `createHonoMutationOptions`.

For each route of our application, we'll create a `{route}.queries.ts` under a folder named `queries` in our web application (these naming conventions are arbitrary and can be changed to anything that you'd like). You can then reuse those query and mutation options across the app with full type safety.

If you want more information about the utility or why you might need it, check out the [hono-react-query repository](https://github.com/reno-stack/hono-react-query).

## Database

Reno Stack uses Drizzle with **Cloudflare D1** (SQLite). The server runs on Cloudflare Workers and binds a D1 database via `wrangler.toml`. First-time setup: create a D1 database (`wrangler d1 create <name>`), set `database_id` in `wrangler.toml`, then run `pnpm db:migrate:local` (or `db:migrate:remote`) from `apps/server`. Generate new migrations with `pnpm db:generate` after schema changes.

## Authentication

It's highly recommended that you check out [Better-Auth's documentation](https://www.better-auth.com/docs/introduction) for learning more about the library.

In short, you have a default schema file (`auth-schema.ts`) in the server app that is generated by Better-Auth and a main entry point called `auth.ts`. You can add any strategies that you want such as OAuth2 (Reno Stack's example comes with a Discord OAuth integration), email and password, OTP, etc

Reno Stack comes with a `withAuth` middleware that you could use in any of your routes/group of routes.

## Creating Routes and Components

Use these commands to create new routes and components:

| Command                    | Description                   |
| -------------------------- | ----------------------------- |
| `pnpm create:route <name>` | \* Create a new server route  |
| `pnpm ui-add <name>`       | Add UI components from Shadcn |

- Note \*: For creating a client route, please follow the instructions in the [TanStack Router file-based routing docs](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing).

## Motivation

Reno Stack is heavily inspired by [T3 stack](https://create.t3.gg/) and it's [Turborepo template](https://github.com/t3-oss/create-t3-turbo), but it takes a different approach to building full-stack web applications. Unlike setups where Next.js handles both the API and client, Reno Stack decouples these components. The frontend is a React application powered by Vite, while the backend is a Hono-powered server. They communicate through type-safe API calls, allowing for faster iteration and a more streamlined development process.

While there is ongoing debate about client-side rendering (CSR) being worse or on par with server-side rendering (SSR) in terms of SEO, Reno Stack is particularly suited for applications where SEO is not a primary concern. This is because features like SSG and SSR are not enabled by default (although they can be added, they're just not in the template at this moment). This approach makes Reno Stack an ideal choice for projects that prioritize speed and simplicity over SEO optimization.

## Future Plans

Plans include a CLI tool for generating projects with different technologies.

## 🧑‍💻 Contributing

PRs are welcome. Open an issue or provide feedback!
