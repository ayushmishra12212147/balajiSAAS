# 🏥 Balaji HMS — Hospital Management System v2.0

> **Developed by [Shubh Software Services](mailto:ayushmishraofficial1427@gmail.com)**
> A full-featured, production-ready Hospital Management System built for modern healthcare facilities.

---

## 📋 Overview

**Balaji HMS v2.0** is a comprehensive Hospital Management System (HMS) designed to digitize and streamline all major hospital operations — from patient registration to billing, OT scheduling, and detailed reporting.

Built as a **cross-platform desktop application** using **Electron + Next.js**, it works seamlessly offline and can be deployed as a SaaS web application for multi-tenant hospital networks.

---

## ✨ Key Features

### 🏥 OPD Management
- Patient registration with UHID generation
- OPD queue management with real-time updates
- Consultation fee tracking
- Doctor and department-wise patient assignment
- Today's OPD summary dashboard

### 🛏️ IPD Management
- Patient admission & bed assignment
- Active patient bed monitoring
- Birth & Death registration with certificate generation
- Discharge management with final billing
- IPD patient search & history

### 🔪 OT (Operation Theater)
- Surgery scheduling and slot management
- Post-operative records
- Surgeon assignment and procedure tracking

### 💰 Billing & Invoicing
- Invoice generation with line items
- Multiple payment modes (Cash, Card, UPI, etc.)
- Partial payments & balance tracking
- Refund claim management
- Payment status dashboard

### 📊 Reports & Analytics
- Daily OPD Report (with Gender & New/Old patient filters)
- Doctor-wise OPD summaries
- Department-wise OPD volumes
- IPD admission & discharge report
- Billing & collection report
- OT surgery report
- Birth & Death registration reports
- Collection summary (Hospital billing overview)
- CSV export & print for all reports

### 👨‍💼 Administration
- Role-based access control (Admin / Receptionist)
- Employee & doctor management
- Ward & bed configuration
- Print template designer (drag & drop canvas)
- Hospital branding (logo, name, letterhead)
- Invoice numbering sequences
- Audit logs & system logs
- Global settings management

### 🔐 Security
- Session-based authentication
- Role-based menu visibility
- Audit trail for all critical actions
- Permission matrix per module

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 18, TypeScript |
| **Styling** | Tailwind CSS v4, CSS Modules |
| **Desktop Shell** | Electron |
| **Database** | PostgreSQL (Production) / SQLite (Dev) |
| **ORM** | Prisma |
| **Auth** | Custom session-based auth |
| **Print Engine** | Custom canvas-based print engine |
| **Icons** | Lucide React |
| **Notifications** | Sonner |
| **Deployment** | Next.js Standalone + Electron Builder |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20+
- **PostgreSQL** (for production) or SQLite (for development)
- **npm** v9+

### 1. Clone the Repository

```bash
git clone https://github.com/ayushmishra12212147/balajiSAAS.git
cd balajiSAAS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory with your database URL, session secrets, and app configuration.

> ⚠️ **Never commit your `.env` file.** It is already in `.gitignore`. Contact the developer for the required environment variables.

### 4. Run Database Migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Seed Initial Admin

```bash
npx tsx prisma/seed.ts
```

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and log in with the default admin credentials set during seeding.

### 7. Run as Electron Desktop App

```bash
npm run electron:dev
```

---

## 🏗️ Build for Production

### Web (Next.js Standalone)

```bash
npm run build
npm start
```

### Desktop (Electron)

```bash
npm run electron:build
```

The packaged `.exe` (Windows) / `.dmg` (Mac) / `.AppImage` (Linux) will be in `/release/`.

---

## 📁 Project Structure

```
balajiSAAS/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── opd/               # OPD module pages
│   ├── ipd/               # IPD module pages
│   ├── ot/                # Operation Theater pages
│   ├── billing/           # Billing module pages
│   ├── reports/           # Reports dashboard
│   ├── admin/             # Administration panel
│   └── api/               # API route handlers
├── components/            # Shared UI components
├── modules/               # Feature modules
│   ├── auth/              # Authentication logic
│   ├── opd/               # OPD business logic
│   ├── ipd/               # IPD business logic
│   ├── billing/           # Billing services
│   ├── reports/           # Report generation services
│   └── print/             # Print engine & templates
├── prisma/                # Database schema & migrations
├── public/                # Static assets
├── lib/                   # Shared utilities & clients
└── permissions/           # Role & permission matrix
```

---

## 🔑 Default Roles

| Role | Access Level |
|------|-------------|
| `SUPER_ADMIN` | Full system access including Admin panel |
| `HOSPITAL_ADMIN` | Full clinical + admin access |
| `EMPLOYEE` (Receptionist) | OPD, IPD, Billing, OT, Reports — No Admin panel |

---

## 📞 Support & Contact

**Shubh Software Services**
- 📱 **Phone:** +91 9555040155
- 📧 **Email:** ayushmishraofficial1427@gmail.com
- 🌐 **GitHub:** [@ayushmishra12212147](https://github.com/ayushmishra12212147)

---

## 📄 License

This software is proprietary and developed exclusively by **Shubh Software Services** for licensed hospital clients.
Unauthorized copying, distribution, or modification is strictly prohibited.

---

> © 2025 Shubh Software Services. All rights reserved.
> *Built with ❤️ in India 🇮🇳*
