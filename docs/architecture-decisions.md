# Architecture Decisions Log

This file records major technical decisions for the portfolio project.  
Each entry includes the date, decision, reasoning, alternatives, and current status.  
New decisions should be appended chronologically.

---

## 📌 Template for new entries
**Date:** YYYY-MM-DD – *Topic*  
- **Decision:** …  
- **Reasoning:** …  
- **Alternatives considered:** …  
- **Status:** Active / Superseded  

---

## 2025-09-14 – Database

**Decision:** Use **MongoDB Atlas (cloud-managed MongoDB)**  
**Reasoning:**  
- Avoid operational overhead of running a database on EC2.  
- Free/low-tier Atlas is sufficient for project scale.  
- Provides automatic backups and scaling without extra config.  

**Alternatives considered:**  
- **Postgres in Docker on EC2**: Would require persistence management (EBS volumes), more setup, higher memory use.  
- **Self-hosted Mongo in Docker**: More maintenance, less reliable.  

**Status:** ✅ Active

---

## 2025-09-14 – Hosting Strategy

**Decision:** Deploy **frontend + backend via Docker Compose on a single EC2 instance**.  
**Reasoning:**  
- Cheapest always-on option (~$7–15/mo).  
- Keeps frontend + backend isolated but still running on the same box.  
- Compose already works locally, so deployment pipeline is straightforward.  
- Professional-looking: shows containerization, CI/CD, and environment separation.  

**Alternatives considered:**  
- **ECS Fargate**: More modern/serverless, but ~$30–40/mo always-on (too expensive for year-round personal site).  
- **Separate EC2 for frontend and backend**: Cleaner isolation, but doubles costs.  
- **S3 + CloudFront for frontend**: Cheaper if site were purely static, but not feasible since we need SSR + API routes.  

**Status:** ✅ Active

---

## 2025-09-14 – CI/CD

**Decision:** Use **GitHub Actions** to deploy on push.  
- **dev branch** → deploy to `dev` environment on EC2.  
- **main branch** → deploy to `prod` environment on EC2.  

**Reasoning:**  
- Demonstrates real-world CI/CD workflow.  
- Easy integration with GitHub repo.  
- Keeps deployment automated and repeatable.  

**Alternatives considered:**  
- Manual SSH + docker-compose up (too manual, not professional).  
- Other CI/CD services (CircleCI, GitLab CI): possible, but GitHub Actions is simpler and free.  

**Status:** ✅ Active

---

## 2025-09-14 – Dev Environment Hosting

**Decision:** Run **both dev and prod environments on the same EC2 instance** using separate Docker Compose projects.  
- Reverse proxy routes traffic:  
  - `mysite.com` → prod containers  
  - `dev.mysite.com` → dev containers  

**Reasoning:**  
- Avoids cost of a second EC2 instance (~$7–8/mo).  
- Still provides a live dev environment accessible at a separate subdomain.  
- Keeps deployment consistent with production (same stack).  
- Sufficient for portfolio purposes even if dev impacts prod occasionally.  

**Alternatives considered:**  
- **Separate EC2 instance for dev**: Cleaner isolation, but doubles costs.  
- **Ephemeral dev envs (Fly.io, Railway, etc.)**: Cheaper, but less consistent with prod.  
- **Local-only dev**: Fine for personal use, but doesn’t provide a shareable dev URL.  

**Status:** ✅ Active
