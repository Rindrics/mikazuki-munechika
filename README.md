# Web app for Japanese Fisheries Stock Assessment project

> [!IMPORTANT]
> This is an unofficial project

## Local Development

### Prerequisites

- Node.js 20 or later
- Docker (for Supabase local development)
- Supabase CLI (installed via pnpm as a dev dependency)

### Setup

#### Install dependencies

```sh
pnpm install
```

#### Start Supabase local development environment

```sh
pnpm run start-db
```

#### Copy environment variables from Supabase status

```sh
pnpm run status-db
```

Create `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-status>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-supabase-status>
USE_IN_MEMORY_USER_REPOSITORY=false
```

#### Run database migrations

Run migrations to set up the database schema:

```sh
pnpm run migrate
```

Or reset the database (local development only):

```sh
pnpm run reset-db
```

#### Create initial users

Run the user creation script to create test users:

```sh
pnpm run create-users
```

This will create five users (ADR 0003: role and stock group design):

- `maiwashi-primary@example.com` (マイワシ太平洋系群 主担当) - password: `maiwashi-primary123`
- `maiwashi-secondary@example.com` (マイワシ太平洋系群 副担当) - password: `maiwashi-secondary123`
- `zuwaigani-primary@example.com` (ズワイガニオホーツク海系群 主担当) - password: `zuwaigani-primary123`
- `zuwaigani-secondary@example.com` (ズワイガニオホーツク海系群 副担当) - password: `zuwaigani-secondary123`
- `admin@example.com` (管理者) - password: `admin123`

#### Start the Next.js development server

```sh
pnpm dev
```

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase API URL (local: `http://127.0.0.1:54321`, production: your Supabase project URL)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (for client-side operations)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for admin operations, used by user creation script)
- `USE_IN_MEMORY_USER_REPOSITORY`: Set to `"true"` to use in-memory repository (for Vercel preview environments), `"false"` to use Supabase

## GitHub Pages

Serve GitHub pages on local:

```sh
cd docs & make pages
```

## Developmental Notes

Blog posts about this app: <https://rindrics.com/tags/mikazuki-munechika/>
(Note: `mikazuki-munechika` is the development codename, named after the Japanese sword "三日月宗近")
