# 📱 QR Machine Tracking System

Real-time machine inventory, transfer, maintenance, and downtime tracking — an Android app and web portal that replace paper-based factory floor processes with a single scan.

## 🔍 Overview

Every machine on the floor is issued a unique QR-coded Asset ID. From there, a scan does the rest — logging a breakdown, starting a repair, generating a transfer gate pass, or requesting spare parts — captured at the exact moment and place it happens, rather than re-entered later at a desk.

Designed to operate at scale: approximately **3,500 machines** across multiple factories, floors, and security gates.

## 📲 Why a mobile app

Every core transaction in this system — a breakdown, a repair, a gate check, a spare-parts request — happens standing next to a machine, not sitting at a desk. The Android app meets the work where it actually occurs; the web portal handles what genuinely is desk work: administration, approvals, and reporting.

## ✨ Features

- 📦 **Inventory** — machine master data tied to a printable QR Asset ID
- 🔁 **Transfer** — factory-to-factory gate passes with multi-stage digital approval
- ⏱️ **Downtime tracking** — scan-to-timer breakdown and repair logging
- 🔧 **Maintenance** — preventive and periodic maintenance logging
- ⚙️ **Spare parts** — scan-based requisition, approval, and installation tracking
- 📊 **Reporting** — breakdown, transfer, and spare-parts reports by machine, line, and mechanic

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| 📱 Mobile | Android (Kotlin), QR scanning |
| 🌐 Web portal | React |
| ⚙️ Backend | Node.js (NestJS) |
| 🗄️ Database | PostgreSQL |
| ☁️ Infrastructure | Docker, Nginx, self-hosted |

## 🏗️ Architecture

Two-server, self-hosted deployment: an application server running the API, web portal, and notification service, and a database server running PostgreSQL with scheduled backups — sitting behind a reverse proxy with SSL. Full details in [`/docs`](./docs).

## ⚙️ Setup

Copy `.env.example` to `.env` and fill in your own values — `.env` is gitignored and never committed. Never commit real credentials, keys, or secrets to this repo.

## 🚧 Status

In active development. See [Issues](../../issues) for current progress.

## 📄 License

[MIT](./LICENSE)
