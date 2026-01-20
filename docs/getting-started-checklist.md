# Beginner Getting Started Checklist (Absolute Basics)

This is a lightweight checklist for first-time setup.
It’s intentionally not detailed — it’s here to help you confirm you have the right accounts + tools before you try to run anything.

## 0) Decide what you’re trying to do

- [ ] **Just run locally** (recommended first)
- [ ] **Contribute code** (lint/build/test)
- [ ] **Push images** (Docker Hub)
- [ ] **Provision / deploy to AWS** (Terraform + ECR/EC2)

## 1) Accounts (create only what you need)

- [ ] GitHub account (to clone / open PRs)
- [ ] Docker Hub account (only needed if you will push dev images)
- [ ] AWS account (only needed if you will:
  - run Terraform in `infra/`
  - push prod images to ECR
  - use S3 buckets / SES email in a real AWS environment)
- [ ] (Optional) A domain name + DNS access (only needed for real HTTPS hosting)

## 2) Install tools on your machine

- [ ] Git
- [ ] Node.js (repo expects Node `>=18.20.2`)
- [ ] npm (bundled with Node) or pnpm (supported, optional)
- [ ] Docker Desktop (macOS/Windows) so you have:
  - [ ] `docker`
  - [ ] `docker compose`

Optional (only if you’re doing AWS/infra work):

- [ ] AWS CLI (`aws`)
- [ ] Terraform (`terraform`) for `infra/`

## 3) Clone the repo

- [ ] Clone the repository locally
- [ ] From the repo root, install dependencies if you’ll run scripts locally:
  - [ ] `npm run install:all` (or `npm install` in root + `backend/` + `frontend/`)

## 4) Create your local environment files (templates → local-only files)

This repo is a monorepo and env files do **not** automatically “cascade” between folders.

- [ ] Repo root:
  - [ ] `cp .env.example .env`
  - [ ] `cp .env.local.example .env.local` (optional overrides)
- [ ] Backend:
  - [ ] `cp backend/.env.local.example backend/.env.local`
- [ ] Frontend:
  - [ ] `cp frontend/.env.local.example frontend/.env.local`

Notes:

- `.env.local` files are meant to be **local-only** (gitignored).
- The Docker Compose local workflow uses `backend/.env` and `frontend/.env` as defaults, and you can override with `.env.local`.
- If you’re unsure what to set, skim [docs/environment-variables.md](./environment-variables.md).

## 5) Minimum local dependencies

- [ ] A MongoDB you can connect to (local MongoDB or MongoDB Atlas)
  - [ ] Put the connection string in `backend/.env.local` as `MONGODB_URI=...`

Optional features (can be skipped for first run):

- [ ] AWS SES credentials (only if you want the contact form email to actually send)
- [ ] S3 buckets (only if you want to run the S3 upload/verify scripts)

## 6) Run it locally

Pick one:

- [ ] Docker (recommended first):
  - [ ] `npm run caddy:up`
  - [ ] Open the site at `http://localhost:8080`
  - [ ] Open the admin UI at `http://localhost:8080/admin`
- [ ] Bare metal (no Docker):
  - [ ] `npm run dev`
  - [ ] Frontend: `http://localhost:3000`
  - [ ] Backend admin: `http://localhost:3001/admin`

Optional (recommended if you want the site to have images immediately):

- [ ] Seed local media into `backend/media/*` from your external seedings folder:
  - [ ] `npm run media:seed`
  - [ ] Details and expected folder layouts: [docs/uploads-and-migration.md](./uploads-and-migration.md)

## 7) (Optional) Push images / deploy

Only do these once local dev works.

- [ ] Docker Hub (dev images): you can run the root script that builds + pushes dev images
- [ ] AWS (prod deploy): you’ll need AWS credentials + Terraform state + ECR access
  - [ ] Start by reading [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md)
  - [ ] Then skim [docs/deployment-orchestrator.md](./deployment-orchestrator.md)
