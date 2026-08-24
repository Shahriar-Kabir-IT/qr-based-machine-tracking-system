# QR-Based Machine Tracking System

## Tech Stack
- **Backend:** NestJS (TypeScript) with TypeORM + PostgreSQL
- **Frontend:** React (TypeScript) with Vite, Ant Design, Recharts, qrcode-react
- **Database:** PostgreSQL 18
- **Deployment:** Two-server setup — App Server (Nginx + Node.js via PM2) and DB Server (PostgreSQL)

## Project Structure
```
backend/
  src/
    app.module.ts              # Root module
    main.ts                    # Entry point (port 3000)
    system.controller.ts       # System admin endpoints
    auth/                      # JWT auth, guards, roles
    users/                     # User entity, service, controller
    machines/                  # Machine inventory CRUD + dashboard queries
    transfers/                 # Machine transfer/loan workflows
    downtime/                  # Breakdown/repair tracking
    maintenance/               # Preventive maintenance logs
    spare-parts/               # Spare part requests
    rental/                    # Machine rental workflow
    dashboard/                 # Dashboard aggregation endpoint
    audit/                     # Audit log entity

frontend/
  src/
    App.tsx                    # Router setup
    main.tsx                   # Entry point
    api/client.ts              # Axios instance with JWT interceptor
    context/AuthContext.tsx     # Auth state, role flags
    components/
      AppLayout.tsx            # Sidebar + header layout
      QrScanner.tsx            # QR code scanner component
    pages/
      Login.tsx
      Dashboard.tsx            # Super admin / admin dashboard
      Inventory.tsx            # Machine inventory table
      Transfers.tsx            # Transfer workflow
      Downtime.tsx             # Downtime reporting
      Maintenance.tsx          # Maintenance logs
      SpareParts.tsx           # Spare parts requests
      Rental.tsx               # Rental management
      MechanicKPI.tsx          # Mechanic performance
      MechanicDashboard.tsx    # Mechanic view
      LineChiefDashboard.tsx   # Line chief view
      LineChiefHistory.tsx     # Service history
      UserDashboard.tsx        # Facility user view
      UserManagement.tsx       # User CRUD (super admin)
      SystemAdmin.tsx          # System monitoring (system_admin only)
```

## Roles
| Role | Access |
|------|--------|
| super_admin | Full access except /system endpoints |
| admin | Inventory, transfers, maintenance, approvals |
| user | Facility-specific dashboard |
| line_chief | Machine list + service history for their floor |
| mechanic | Service requests for their floor |
| system_admin | System monitoring only (/system endpoints) |

## Key Patterns
- All API routes prefixed with `/api/`
- JWT authentication with role-based guards
- TypeORM with `synchronize: true` (auto-migration)
- Frontend proxy: Vite dev server proxies `/api` to `localhost:3000`
- Production: Nginx serves frontend static files, reverse proxies `/api` to backend
- HTTPS with self-signed SSL certificate (required for camera/QR scanning)

## Build Commands
- Backend: `cd backend && npm run build` (compiles to `dist/`)
- Frontend: `cd frontend && npm run build` (outputs to `dist/`)
- Backend runs in production via: `node dist/main` (managed by PM2)

## Database
- PostgreSQL with TypeORM entities auto-synced
- Machine data includes facility (AGL, ABM, AJL), floor, line assignments
- Transfer workflows use multi-step approval states

## Status
This application is under active development.
