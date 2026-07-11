# HMS v2.0 — OWASP Top 10 (2021) Mapping

This document details how Shreeganesha HMS v2.0 mitigates the OWASP Top 10 vulnerabilities.

---

## 1. A01:2021 – Broken Access Control
- **Risk**: Users bypassing permissions to view/mutate resources.
- **HMS Control**:
  - Middleware intercepts non-public routes.
  - Server-side dynamic `requirePermission` asserts user authorization before executing logic.
  - Isolated tenant queries bounds database operations to the authenticated user's hospital.

## 2. A02:2021 – Cryptographic Failures
- **Risk**: Plaintext storage of secrets, weak hashing, or unencrypted local data.
- **HMS Control**:
  - Passwords hashed using Bcrypt/Argon2id.
  - Local configuration encrypted via Windows DPAPI (tied to active user SID).
  - Transit secure cookies (SameSite: strict, HttpOnly, Secure).

## 3. A03:2021 – Injection
- **Risk**: SQL or shell command execution by intercepting user parameters.
- **HMS Control**:
  - Full reliance on Prisma parameterization. Zero raw query concatenation.
  - Backup pg_dump and psql processes parameterized into array arguments via `execFileSync`.
  - Escaping dynamic text output in Print Engine layouts to block HTML injection.

## 4. A04:2021 – Insecure Design
- **Risk**: Poor design principles, lack of threat modeling, or deficient secure lifecycles.
- **HMS Control**:
  - Implementation of STRIDE threat model.
  - Separation of duties (Employee vs Admin vs Super Admin roles).

## 5. A05:2021 – Security Misconfiguration
- **Risk**: Exposing debug logs, stack traces, missing headers, or default passwords.
- **HMS Control**:
  - Stack traces and SQL queries suppressed in production error formats.
  - Strict security headers (CSP, HSTS, X-Frame-Options) injected by default in Next.js middleware.
  - Electron main process disables devTools in production package and sandboxes renderer threads.

## 6. A06:2021 – Vulnerable and Outdated Components
- **Risk**: Outdated libraries or vulnerable packages.
- **HMS Control**:
  - Standardized dependency lockfile tracking.
  - Automated `npm audit` run to review and address vulnerability alerts.

## 7. A07:2021 – Identification and Authentication Failures
- **Risk**: Brute-forcing passwords, session fixation, or session hijacking.
- **HMS Control**:
  - Max 5 failed login attempts triggers 15-minute account lockout.
  - 5 concurrent active session limit per user (deletes older session hashes).
  - Timing attack protection implemented on authentication password comparison.

## 8. A08:2021 – Software and Data Integrity Failures
- **Risk**: Unverified updates, untrusted serialization, or backup corruption.
- **HMS Control**:
  - Backup packages include SHA-256 integrity checksums validated on restore.
  - Pre-restore safe snapshot rollback generated automatically.
  - Dynamic configuration files validated against structured runtime interfaces.

## 9. A09:2021 – Security Logging and Monitoring Failures
- **Risk**: Inadequate logging of events, credential logs, or log tampering.
- **HMS Control**:
  - Core actions logged to disk files and database audits tables.
  - Passwords, cookies, tokens, and personal clinical data are completely omitted from logs.
  - Log rotation limits size to 100MB and deletes logs older than 30 days to prevent disk exhaustion.

## 10. A10:2021 – Server-Side Request Forgery (SSRF)
- **Risk**: Fetching external HTTP queries from user inputs.
- **HMS Control**:
  - No endpoints accept user-supplied URLs to execute fetches, eliminating SSRF vectors.
