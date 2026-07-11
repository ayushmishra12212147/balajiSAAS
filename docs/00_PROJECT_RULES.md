# PROJECT_RULES.md

# Hospital Management System (HMS v2)

## Master Development Rules & Engineering Constitution

---

# 1. Project Identity

This project is a production-grade Hospital Management System (HMS v2).

This is NOT a demo project.
This is NOT an MVP.
This is NOT a tutorial.

This project will become the master codebase from which customized versions will be created for multiple hospitals.

Every architectural decision must prioritize:

* Maintainability
* Stability
* Performance
* Security
* Scalability
* Readability
* Long-term support

Never choose shortcuts over proper engineering.

---

# 2. Primary Tech Stack

Frontend

* Next.js 15 (App Router)
* React 19
* TypeScript

Backend

* Next.js Route Handlers

Database

* PostgreSQL

ORM

* Prisma

Validation

* Zod

Forms

* React Hook Form

State

* Zustand

Tables

* TanStack Table

UI

* Tailwind CSS
* shadcn/ui

Desktop

* Electron (Future)

---

# 3. Development Philosophy

Every feature must be:

* Modular
* Reusable
* Secure
* Transaction-safe
* Fully typed
* Production ready

Never generate placeholder code.

Never leave TODO comments.

Never create temporary implementations.

Every generated file must compile successfully.

---

# 4. Architecture Rules

Always follow

Route

↓

Validation

↓

Service

↓

Prisma

Business logic belongs ONLY inside Services.

Validation belongs ONLY inside Zod schemas.

Database access belongs ONLY through Prisma.

Never place business logic inside:

* React Components
* Route Handlers
* UI Pages

---

# 5. Folder Rules

Every module must remain self-contained.

Example

modules/

patient/

components/

services/

schemas/

hooks/

types/

utils/

billing/

components/

services/

schemas/

hooks/

types/

utils/

Do not scatter files across unrelated folders.

---

# 6. Coding Standards

Always

* Strict TypeScript
* No any
* Functional Components
* Async/Await
* Reusable Components
* Small Functions
* SOLID Principles
* DRY Principles

Never

* Duplicate logic
* Hardcode values
* Mix concerns
* Ignore errors

---

# 7. Database Rules

The database is the single source of truth.

Never duplicate data unnecessarily.

Every table must include:

* id
* createdAt
* updatedAt
* createdBy
* updatedBy

Soft delete must be used for important entities.

Never physically delete:

* Patients
* Bills
* Payments
* Refunds

All multi-step operations must use database transactions.

If one operation fails,

ROLLBACK EVERYTHING.

---

# 8. Authentication Rules

Authentication must use secure server-side sessions.

Never expose secrets.

Never store passwords.

Passwords must always be hashed.

All protected APIs require authentication.

---

# 9. Permission Rules

Permissions are toggle-based.

Every action must verify permission.

Frontend hiding is NOT security.

Every API must verify permissions independently.

Permission changes should take effect immediately.

Never trust client-side permission checks.

---

# 10. Security Rules

The system must actively protect against:

* SQL Injection
* NoSQL Injection
* Server Side Template Injection
* XSS
* CSRF
* Replay Attacks
* Regex DoS
* Large Payload DoS
* Slowloris
* Path Traversal
* Clickjacking
* Open Redirect
* Prototype Pollution
* Mass Assignment
* Broken Access Control
* Session Fixation
* Timing Attacks
* ID Enumeration
* Duplicate Requests
* Duplicate Payments
* Race Conditions
* Business Logic Abuse
* Secret Leakage
* Clipboard Abuse
* File Upload Abuse
* MIME Confusion
* Malware Upload
* Zip Bombs
* CSV / Formula Injection

Every feature must consider security before implementation.

---

# 11. Validation Rules

Never trust user input.

Validate:

* Body
* Query
* Params
* Files

Always use Zod.

Never bypass validation.

---

# 12. Error Handling

All APIs must return standardized responses.

Never leak stack traces.

Never expose internal database errors.

Errors must be logged.

Users should receive clean error messages.

---

# 13. Logging Rules

Maintain separate logging for:

* Application
* Security
* Audit
* Errors

Every important action should be auditable.

---

# 14. Transaction Rules

The following operations must always use database transactions:

* Patient Registration
* OPD Registration
* IPD Admission
* Billing
* Refund
* OT Completion
* Birth Registration
* Death Registration
* Pharmacy Billing

Partial database updates are never acceptable.

---

# 15. HMS Business Rules

The system is designed around Indian hospital workflows.

Navigation:

* OPD
* IPD
* Billing
* OT
* Pharmacy
* Laboratory
* Manage
* Admin

Do not redesign workflows unless explicitly instructed.

---

# 16. UI Philosophy

Speed is more important than visual effects.

Hospital staff should complete tasks with the fewest clicks possible.

Avoid unnecessary animations.

Avoid dashboard clutter.

Use a classic menu-bar layout similar to traditional Windows HMS software.

---

# 17. Printing Rules

Printing is a first-class feature.

Never hardcode print layouts.

Use a reusable Print Engine architecture.

Future support must include:

* A4
* Thermal
* PDF
* Drag-and-drop template designer

---

# 18. Performance Rules

Avoid unnecessary renders.

Avoid N+1 database queries.

Use pagination.

Use lazy loading where appropriate.

Optimize expensive queries.

---

# 19. API Rules

Every endpoint must:

Validate

↓

Authenticate

↓

Authorize

↓

Execute Business Logic

↓

Return Standard Response

Never skip this flow.

---

# 20. Testing Rules

Every completed phase must:

Compile successfully.

Pass linting.

Pass type checking.

Run without runtime errors.

No broken imports.

No unused files.

---

# 21. Development Process

Before writing code:

Understand the feature.

Understand dependencies.

Review existing architecture.

After coding:

Verify build.

Verify security.

Verify types.

Verify imports.

Verify formatting.

---

# 22. AI Behaviour Rules

The AI must never:

Invent architecture without justification.

Break previous design decisions.

Refactor unrelated modules.

Rename files without reason.

Delete working code unnecessarily.

Introduce breaking changes.

Generate placeholder implementations.

Ignore security.

---

# 23. If Requirements Are Unclear

Do NOT guess.

Instead:

Explain the ambiguity.

Provide possible approaches.

Recommend the best approach.

Wait for approval if the decision affects architecture.

---

# 24. Definition of Done

A task is complete only if:

* Code compiles.
* Security considered.
* Types are correct.
* Validation implemented.
* Errors handled.
* Permissions enforced.
* Transactions used where required.
* Documentation updated.
* Existing functionality remains intact.

Until all conditions are satisfied, the task is NOT complete.

---

# Final Rule

Before implementing any feature, read this document completely and follow every rule.

If any instruction in a future prompt conflicts with this document, ask for clarification before proceeding instead of making assumptions.
