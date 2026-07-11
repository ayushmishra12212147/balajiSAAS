# HMS v2.0 — OWASP ASVS v4.0 Checklist Mapping

This document maps Shreeganesha HMS v2.0 architecture and security controls to the **OWASP ASVS v4.0 (Application Security Verification Standard)** Level 1 & Level 2 requirements.

---

## ASVS Checklist Verification Matrix

| Section | Requirement ID | Requirement Description | Compliance Status | Implementation Details / Verification |
|---|---|---|---|---|
| **V1: Architecture** | **1.1.1** | Secure Software Development Lifecycle. | **Compliant** | Hardened in Phase 15. Standard checklists in place. |
| | **1.4.1** | Context isolation & sandboxing on desktop. | **Compliant** | Electron configured with sandbox & isolation. |
| **V2: Authentication**| **2.1.1** | All passwords must be hashed. | **Compliant** | Argon2id / Bcrypt password provider. |
| | **2.1.12**| Brute-force account lockout. | **Compliant** | Account lockout after 5 failures for 15 mins. |
| **V3: Session** | **3.1.1** | Secure Session identifiers. | **Compliant** | Crypto random 32-byte tokens. SHA-256 in DB. |
| | **3.2.1** | Set `HttpOnly`, `SameSite: strict`, `Secure`.| **Compliant** | Configured in `config/auth.ts`. |
| | **3.3.1** | Session concurrent limits. | **Compliant** | Capped at 5 concurrent sessions per account. |
| **V4: Access Control**| **4.1.1** | Deny by Default routing. | **Compliant** | Non-public routes blocked by default in middleware. |
| | **4.1.3** | Validate role/permissions on server side. | **Compliant** | `requirePermission` dynamic checks on every route. |
| **V5: Validation** | **5.1.1** | Server-side validation of all parameters. | **Compliant** | Zod input validation schemas. |
| | **5.2.3** | Output encoding for XSS prevention. | **Compliant** | `escapeHtml` output escaping in print layouts. |
| | **5.3.8** | Parameterized Database Queries. | **Compliant** | Prisma parameterized engine. No dynamic SQL concat. |
| | **5.3.10**| Prevent Command Injection. | **Compliant** | Parameterized subprocess argument arrays used. |
| **V6: Cryptography** | **6.2.1** | Encryption keys protected at rest. | **Compliant** | Config file encrypted using Windows DPAPI. |
| **V7: Error/Logging** | **7.1.1** | Never log secrets. | **Compliant** | Log streams sanitized (no credentials/passwords). |
| | **7.4.1** | No verbose errors returned to client. | **Compliant** | Stack traces hidden. Standard error responses. |
| **V9: Communication**| **9.1.1** | Enforce TLS transmission (HSTS). | **Compliant** | HSTS max-age headers applied in middleware. |
| **V14: Configuration**| **14.2.1**| Safe CSP headers. | **Compliant** | Middleware injects secure CSP. |
| | **14.2.3**| Clickjacking protections. | **Compliant** | `X-Frame-Options: DENY` applied to all views. |
