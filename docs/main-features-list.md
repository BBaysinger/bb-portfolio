This document contains a list of main features in the site so we can keep track of everything that deserves mentioning in the main readme and such.

simulated depth magnetic 'fluxel' grid
parallax project carousel
custom sprite rendering
ssr/next portfolio projects list
ssg/next dynamic routing projects view
payload cms backend
sprite sheet image processing scripts
magnetic/sticky road sign
custom physics kinetic orb
rem-based fluid scaling property mixin
static fluid scaling property mixin
scroll-aware highlighting project list
confidential/NDA project filtering
automated (re)deployment orchestrator
page slide-out nav
transform-positioned footer

Here's what GTP suggested:

I reviewed your current features list and scanned the repo (frontend carousel code, Payload config/collections, infra/deploy docs and scripts) to propose concrete additions you can highlight next.

What I looked at (quick pass)
main-features-list.md and top-level README
Backend Payload config, collections, and SES email service
Frontend carousel/layered parallax components
Deploy/IaC scripts and Terraform layout
Suggested additions for the features list
Frontend UX/interaction

layered parallax carousel engine (master/slave synchronization)
device mockup overlays with tilt and stabilization states
route-driven carousel navigation with deep linking
logo/info swapper animations tied to active slide
scroll-aware projects list with client-side highlighting
fluid responsive type/spacing system (documented in fluid-responsive-system.md)
CMS/data modeling

type-safe payload cms with generated types
automatic slug generation and sortable index for projects
nda-aware content sanitization for anonymous users
rich project metadata (brand, tags, role, year, awards, urls)
image collections for screenshots/thumbnails/brand logos
sharp-backed image processing and 5mb upload limits
Storage/media pipeline

s3-backed media storage with per-collection prefixes
instance-role support with optional static credentials
media migration/verification scripts (migrate-to-s3, update media urls, rebuild records)
local filesystem storage for local profile
Api/security

strict env_profile-based config validation (fail-fast on missing)
locked-down csrf/cors allowlists per environment
contact api via aws ses with html/text email and reply-to
health-check endpoint for uptime/deploy validation
role-based access control for admin-only mutations
Devops/deployment

terraform iac: one-command provision/teardown of full stack
systemd-managed docker services on ec2 with auto-restart
dual-registry image strategy (docker hub dev, ecr prod) with switch script
secure docker builds via buildkit secret mounts + minimal build args
generated env files on host via ci/cd (no secrets in repo)
reverse proxy options (caddy/nginx) and compose profiles (local/dev/prod)
single-command redeploy scripts for dev/prod or both
Developer experience/testing

monorepo with strict typescript on frontend and backend
unified eslint configs for frontend/backend
playwright e2e and vitest setup for backend
local dev proxy and hot-reload compose profile
Data ops and backups

json dumps for seed data and repeatable imports
automated database backup exports (with dated folders)
Optional: items to prioritize for README write-ups
Layered Parallax Carousel (how master/slave sync works and why it’s unique)
NDA-aware Content Model (sanitization logic and access control)
Env-Profile Guardrails (fail-fast config + csrf/cors strategy)
S3 Media Architecture (prefixes, instance role, migration scripts)
Dev/Prod Image Strategy (BuildKit secrets, dual registries, systemd on EC2)
Contact via SES (secure flow, HTML/Text fallback, reply-to behavior)


