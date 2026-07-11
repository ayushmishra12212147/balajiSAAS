# HMS v2.0 — Threat Model (STRIDE)

This document presents the threat model for Shreeganesha HMS v2.0 structured under the Microsoft **STRIDE** framework:
- **S**poofing
- **T**ampering
- **R**epudiation
- **I**nformation Disclosure
- **D**enial of Service
- **E**levation of Privilege

---

## 1. System Assets & Boundaries
The target system boundaries include:
- **Electron GUI (Renderer Process)**: User interface wrapper, isolated from node environment.
- **IPC Tunnel**: Bridge between Renderer and Electron Main Process.
- **Embedded Local Server**: Handles API routing, Print Engine execution, and database connection.
- **PostgreSQL Database**: Relational schema containing patient clinical data, bills, and logs.

---

## 2. STRIDE Threat Assessment

### 2.1 Spoofing (Identity)
- **Threat**: An attacker steals session tokens or logs in via a brute-forced account to spoof an employee identity.
- **Remediation**:
  - SHA-256 session token hashing in the database.
  - Locking accounts after 5 failed login attempts.
  - Enforcing a maximum limit of 5 concurrent sessions.
  - Timing-attack mitigation for login checks.

---

### 2.2 Tampering (Data Integrity)
- **Threat**:
  - Command Injection: Tampering with config/arguments to execute arbitrary shell scripts during database backup.
  - Print Template Manipulation: Modifying printer settings or injecting HTML tags into print parameters.
- **Remediation**:
  - Parameterized Prisma ORM database transactions.
  - Refactoring shell invocations inside `BackupService` to array arguments via `execFileSync`.
  - Escaping all dynamic fields inside the Print Engine.

---

### 2.3 Repudiation (Audit Bypass)
- **Threat**: An administrator performs sensitive system modifications or restores an unauthorized database backup without generating an audit trail.
- **Remediation**:
  - Mandatory audit logs recorded for all administrative actions (backups, restores, settings changes, user creations) using a dual-write mechanism (both to `audit.log` file and PostgreSQL `audits` table).
  - Pre-restore snapshots automatically created before any database restoration.

---

### 2.4 Information Disclosure (Leakage)
- **Threat**:
  - Session Hijacking: Accessing session cookies.
  - Leakage of plain-text passwords or encryption keys.
  - Verbose error disclosures.
- **Remediation**:
  - Session cookies enforce `HttpOnly`, `SameSite: strict`, and `Secure` settings.
  - Database config file encrypted using Windows DPAPI.
  - Passwords hashed using Argon2id/Bcrypt.
  - Centralized Error wrapper hiding stack traces and raw database errors in API responses.

---

### 2.5 Denial of Service (Resource Exhaustion)
- **Threat**: An attacker submits massive request payloads, triggers nested regex evaluations, or logs in concurrently to crash the local Next.js server.
- **Remediation**:
  - Rate limiter (token bucket algorithm) in `middleware.ts`.
  - Body size constraints.
  - Checked all regular expressions to verify linear matching rules (no catastrophic backtracking quantifiers).

---

### 2.6 Elevation of Privilege
- **Threat**: An employee with restricted access (e.g. OPD billing clerk) alters request parameters to execute Super Admin actions (such as backups, restores, or department deletions).
- **Remediation**:
  - Dual-verification: Authentication wrapper first, followed by real-time role/permission validation (`requirePermission`) in the database before routing requests to business logic.
  - In-place query boundaries filtering queries by target user ID and tenant hospital ID.
