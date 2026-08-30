# QR Machine Tracking System

Real-time machine inventory, transfer, maintenance, and downtime tracking — a web application that replaces paper-based factory floor processes with QR code scanning. Android version coming soon.

## Overview

Every machine on the floor is issued a unique QR-coded Asset ID. From there, a scan does the rest — logging a breakdown, starting a repair, generating a transfer gate pass, or requesting spare parts — captured at the exact moment and place it happens, rather than re-entered later at a desk.

Designed to operate at scale: approximately **3,500 machines** across multiple factories, floors, and security gates.

## Features

- **Inventory** — machine master data with two-step approval and printable QR Asset ID tags
- **Transfer** — permanent, loan, and internal transfers with multi-stage approval, dispatch, and receive
- **Loan Management** — loan tracking with expected return dates, overdue alerts, and return approval
- **Downtime Tracking** — breakdown reporting with auto-calculated response time, repair duration, and total downtime
- **Maintenance** — preventive, periodical, and daily maintenance logging
- **Spare Parts** — requisition, approval, store issuance, and installation tracking
- **Rental** — full lifecycle for external machines with gate security receipt/return and document generation
- **Role-Based Access** — 7 roles (Super Admin, Admin, User, Line Chief, Mechanic, Security, System Admin) with granular permissions
- **Dashboard** — real-time stats, overdue loan alerts, return request approvals, breakdown activity, and charts
- **Mechanic KPI** — per-mechanic performance metrics with monthly breakdown

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Ant Design, Recharts |
| Backend | Node.js (NestJS), TypeORM, Passport JWT |
| Database | PostgreSQL |
| Infrastructure | PM2, HTTPS (self-signed SSL), self-hosted |

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure database and JWT settings
3. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
4. Start development:
   ```bash
   # Backend
   cd backend && npm run start:dev

   # Frontend
   cd frontend && npm run dev
   ```

`.env` is gitignored and never committed. Never commit real credentials, keys, or secrets to this repo.

## Status

**Web app** — actively deployed and in use.

**Android app** — under development, will be uploaded separately.

## License

[MIT](./LICENSE)
