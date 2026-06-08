# TimeTrack – Employee Clock-In System

A web-based employee time and attendance management system for facility operations. TimeTrack handles daily clock-in/clock-out tracking, shift assignments, visitor logging, weekly report generation, and role-based user access — all backed by Supabase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Routing | React Router DOM 7 |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable + html2canvas |
| Icons | Lucide React |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password + Google OAuth) |

---

## Features

- **Dashboard** — Real-time overview of active staff grouped by department (Security, Gardener, Housekeeper, Dishwasher) with date filtering
- **Employee Management** — Add, edit, and deactivate employees with effective and resignation dates
- **Shift Management** — Assign shifts with overlap detection and 15-minute interval time slots
- **Attendance Reports** — Weekly reports with hours worked, overtime, and holiday calculations
- **PDF Export** — Download attendance reports as formatted PDF files
- **Manual Entry** — Correct or add missing clock-in/clock-out records with audit trail
- **Visitor Log** — Monthly visitor tracking with year/month selector (data from Dec 2025 onward). Summary section offers three interchangeable views: pie chart, stat cards, and breakdown table. Detail log supports filtering by visit purpose and host.
- **User Management** *(Master Admin only)* — Approve or suspend users, assign roles (user / admin / master_admin), and permanently delete accounts. The logged-in master admin account is protected from accidental modification.

---

## Prerequisites

- Node.js 18+
- npm
- A Supabase project with the `facility_management` schema

---

## Getting Started

```bash
# 1. Clone the repository
git clone <repository-url>
cd clockin-system

# 2. Install dependencies
npm install

# 3. Configure environment variables (see below)
cp .env.example .env

# 4. Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) API key |

---

## Project Structure

```
clockin-system/
├── src/
│   ├── App.jsx                  # Route definitions
│   ├── main.jsx                 # React entry point
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state, role management, verification gate
│   ├── layouts/
│   │   └── SidebarLayout.jsx    # Sidebar navigation + header wrapper
│   ├── pages/
│   │   ├── Login.jsx            # Authentication UI
│   │   ├── Dashboard.jsx        # Staff overview by department
│   │   ├── EmployeePage.jsx     # Employee CRUD
│   │   ├── ShiftPage.jsx        # Shift assignment
│   │   ├── ManualEntryPage.jsx  # Clock record corrections
│   │   ├── DetailsPage.jsx      # Weekly reports & PDF export
│   │   ├── VisitorPage.jsx      # Visitor tracking & analytics
│   │   └── UserManagement.jsx   # Admin user approval panel
│   └── lib/
│       ├── supabase.js          # Supabase client (facility_management schema)
│       └── services.js          # Data access layer (employees, logs, shifts, visitors)
├── vite.config.js
├── package.json
└── .env
```

---

## Routes

| Path | Page | Access |
|------|------|--------|
| `/login` | Login | Public |
| `/dashboard` | Staff overview by department | All authenticated users |
| `/employees` | Employee CRUD | All authenticated users |
| `/visitors` | Visitor log & analytics | All authenticated users |
| `/shifts` | Shift assignment | All authenticated users |
| `/details` | Weekly attendance reports & PDF export | All authenticated users |
| `/manual-entry` | Clock record corrections | All authenticated users |
| `/user-management` | User approval & role assignment | `master_admin` only |

---

## Authentication & Roles

Only `@turbo.co.th` email addresses can register. New accounts are created with `is_verified = false` and are locked out until a Master Admin approves them.

| Role | Access |
|------|--------|
| `user` | View and basic operations |
| `admin` | Full operational access |
| `master_admin` | Everything + User Management |

**Login flow:**
1. Sign in with email/password or Google OAuth
2. System checks domain and verification status
3. Unverified accounts are immediately signed out with a pending-approval message
4. Master Admin approves and assigns a role via the User Management page

---

## Database Schema

All tables live in the `facility_management` Supabase schema.

| Table | Description |
|-------|-------------|
| `employees` | Employee master records (name, department, person_id, dates) |
| `shifts` | Shift assignments with start/end times and active date ranges |
| `door3_raw` | Raw hardware scan logs (entry/exit timestamps from door scanner) |
| `door3_manual_edits` | Manual clock corrections with reason and editor audit trail |
| `date_dim` | Holiday and special date calendar |
| `visitor` | Visitor log entries (date, purpose, host, person details) |
| `user_roles` | User access control (email, role, verification status) |

---

## Available Scripts

```bash
npm run dev      # Start development server with HMR
npm run build    # Production build
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```
