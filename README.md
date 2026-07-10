# Finance AI — Personal Finance PWA

Self-hosted personal finance app. Record income/expenses in **under 10 seconds**
using natural language ("beli es kelapa 5000 pake bca") or by scanning a receipt.
No bank integration — you create accounts manually and the app derives balances
from transaction history.

Single Next.js app (frontend + API in one deployable), Bun runtime, PostgreSQL,
and a single OpenAI-compatible endpoint powering both the text assistant and the
vision OCR.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Bun** as runtime + package manager
- **PostgreSQL** via **Drizzle ORM**
- **PWA** (installable, offline-tolerant service worker)
- **AI/OCR**: any OpenAI-compatible `/chat/completions` endpoint (OpenAI, Gemini
  OpenAI-compat, OpenRouter, Groq, LM Studio, Ollama, …)

## Quick start (local)

```bash
# 1. Install deps
bun install

# 2. Configure environment
cp .env.example .env
#   → set AUTH_SECRET (any long random string)
#   → set AI_BASE_URL + AI_API_KEY (your OpenAI-compatible endpoint)
#   → point DATABASE_URL at your Postgres

# 3. Start Postgres (or use your own)
docker compose up -d db

# 4. Create schema + demo data
bun run db:generate   # generate SQL migration from schema
bun run db:migrate    # apply it
bun run db:seed       # optional: demo user + sample data

# 5. Run
bun run dev           # http://localhost:3000
```

Demo login (after `db:seed`): **demo@finance.app / password123**

## Run everything with Docker

```bash
cp .env.example .env   # fill in AI_API_KEY + AUTH_SECRET
docker compose up -d --build
# then, once containers are up, create the schema:
docker compose exec app bun run db:push
docker compose exec app bun run db:seed   # optional
```

App on `http://localhost:3000`, Postgres on `5432`.

## AI configuration

One base URL + key powers both features (set in `.env`):

| Variable          | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `AI_BASE_URL`     | e.g. `https://api.openai.com/v1`                   |
| `AI_API_KEY`      | your key                                           |
| `AI_MODEL`        | text model for Quick Capture (e.g. `gpt-4o-mini`)  |
| `AI_VISION_MODEL` | vision model for Receipt Scanner (can equal above) |

Gemini example: `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`,
`AI_MODEL=gemini-2.0-flash`. Local example (Ollama): `AI_BASE_URL=http://localhost:11434/v1`.

If `AI_API_KEY` is unset, Quick Capture falls back to a basic heuristic parser
and the Receipt Scanner is disabled.

## How balances work

```
current_balance = initial_balance + Σ income − Σ expense + Σ adjustment
```

`initial_balance` is set once per account. Every income/expense/adjustment
transaction updates the cached `current_balance` (recomputed server-side).
**Balance Adjustment** reconciles the app balance against your real account
balance by writing a signed `adjustment` transaction, so history stays consistent.

## Periods

A **period** is your budgeting window and does *not* follow the calendar month.
Pick a start day (e.g. payday on the 25th) in Settings; reports (Expense/Income
This Period) are computed against the active period. Example: the "July" period
runs 25 Jun – 24 Jul.

## Project structure

```
src/
  app/
    page.tsx                 Dashboard (Total Money, Expense This Period, accounts, recent)
    login/ register/         Auth pages
    accounts/                Manage accounts + balance adjustment
    transactions/            Activity list + filters
    scan/                    Receipt Scanner (camera → OCR → draft)
    settings/                Account, AI status, period management, logout
    api/                     Route handlers (auth, accounts, categories,
                             periods, transactions, dashboard, ai/parse, ai/receipt)
  components/                QuickCapture, TransactionSheet, BottomNav, ...
  db/                        Drizzle schema, client, migrate, seed
  lib/                       auth, balance, period, resolve, ai/*, utils
  middleware.ts              Route protection
public/                      manifest.json, sw.js, icons
```

## Status

This is a **full scaffold**: every screen and endpoint exists and the core flows
(auth, accounts, transactions, balances, periods, Quick Capture, Receipt Scanner)
are wired end-to-end. Rough edges intentionally left for iteration:

- Transfer transactions (schema-ready, no UI yet)
- Budgets, saving goals, AI insights, export, recurring, reminders (future)
- Edit-transaction UI (API supports PATCH; only delete is wired in the list)
- Password reset / multi-device session management

## Security notes (self-hosting)

- Set a strong `AUTH_SECRET`. Sessions are JWTs in an httpOnly cookie.
- Registration is open by default — put it behind your own network/VPN, or
  disable the register route after creating your account.
- Passwords hashed with PBKDF2-SHA256 (120k iterations).
