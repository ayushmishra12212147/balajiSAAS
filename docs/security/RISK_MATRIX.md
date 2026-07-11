# HMS v2.0 — Security Risk Matrix

This document maps potential security risks, evaluates their likelihood and impact, categorizes their severity, and details the implemented mitigation strategies.

---

## 1. Risk Matrix Reference Grid

| Likelihood \ Impact | Minor | Moderate | Major | Critical |
|---|---|---|---|---|
| **Almost Certain** | Medium | High | Critical | Critical |
| **Likely** | Medium | High | High | Critical |
| **Possible** | Low | Medium | High | High |
| **Unlikely** | Low | Low | Medium | High |
| **Rare** | Low | Low | Medium | Medium |

---

## 2. Threat Risk Register

### 2.1 Database Credential Disclosure / Injection
- **Description**: An attacker bypasses input validation to inject malicious SQL or command parameters, leaking database content.
- **Likelihood**: Rare
- **Impact**: Critical
- **Initial Risk Tier**: High
- **Mitigations Implemented**:
  - Enforced parameterization in all Prisma ORM queries.
  - Refactored `BackupService` to run shell-less array arguments via `execFileSync`.
  - Strictly restricted database connections to `localhost` in desktop deployments.
- **Residual Risk**: Low

---

### 2.2 Session Hijacking (Man-in-the-Middle)
- **Description**: An attacker intercepts active session cookies to access the HMS system as a valid user.
- **Likelihood**: Unlikely
- **Impact**: Major
- **Initial Risk Tier**: High
- **Mitigations Implemented**:
  - Session cookies configured as `HttpOnly` (inaccessible to scripts).
  - Enforced `SameSite: strict` to block cross-site cookie leaks.
  - Required `Secure: true` in production (enforcing HTTPS transmission).
  - Applied concurrent session limit of 5 per user to terminate old sessions.
- **Residual Risk**: Low

---

### 2.3 Stored / Reflected Cross-Site Scripting (XSS)
- **Description**: A malicious employee or patient injects `<script>` payloads into text fields (e.g. diagnoses, names) that run in other users' browsers.
- **Likelihood**: Possible
- **Impact**: Moderate
- **Initial Risk Tier**: Medium
- **Mitigations Implemented**:
  - Custom HTML escaping helper implemented in the Print Engine.
  - Strict Content-Security-Policy (CSP) headers applied to all responses, blocking execution of unapproved scripts.
- **Residual Risk**: Low

---

### 2.4 CSRF (Cross-Site Request Forgery)
- **Description**: An external malicious site triggers state-mutating requests (e.g. creating invoices or changing passwords) on behalf of a logged-in user.
- **Likelihood**: Unlikely
- **Impact**: Major
- **Initial Risk Tier**: High
- **Mitigations Implemented**:
  - Double-submit CSRF cookie checks enforced via Next.js Middleware.
  - Strict `SameSite` browser cookie isolation.
- **Residual Risk**: Low

---

### 2.5 Local Host Device Tampering (Desktop Deployment)
- **Description**: An attacker with local physical access extracts configuration files or local database credentials.
- **Likelihood**: Possible
- **Impact**: Moderate
- **Initial Risk Tier**: Medium
- **Mitigations Implemented**:
  - Config storage encrypted using **Windows DPAPI** (tied to local user profile).
  - Electron Context Isolation, Sandboxing, and disabled Node Integration prevent malicious scripts from accessing local system resources.
- **Residual Risk**: Low

---

### 2.6 Denial of Service (LDoS / ReDoS)
- **Description**: An attacker uploads huge payloads or executes catastrophic backtracking regexes to exhaust system memory and CPU.
- **Likelihood**: Unlikely
- **Impact**: Moderate
- **Initial Risk Tier**: Medium
- **Mitigations Implemented**:
  - Checked all regular expressions for catastrophic backtracking quantifiers.
  - Enforced rate limiting at the middleware level.
  - Payload limits enforced on JSON inputs.
- **Residual Risk**: Low
