# SECURITY_RULES.md

# Hospital Management System (HMS v2)

## Security Engineering Standards

---

# Purpose

This document defines all security standards for HMS v2.

Every feature, API, database query, and UI component must follow these rules.

Security is mandatory from the first line of code.

---

# General Rules

Always assume every request is malicious until validated.

Never trust:

* User input
* URL parameters
* Query parameters
* Request body
* Cookies
* Headers
* Uploaded files

Everything must be validated server-side.

---

# Authentication

* Passwords must always be hashed.
* Never store plain-text passwords.
* Never expose passwords.
* Store sessions securely.
* Expire inactive sessions.
* Allow administrators to terminate active sessions immediately.
* Record last login time and failed login attempts.

---

# Authorization

Every protected API must follow this order:

Validate Request

↓

Authenticate User

↓

Check Permission

↓

Execute Business Logic

↓

Return Response

Never rely on frontend permission checks.

---

# Input Validation

Every request must validate:

* Body
* Query
* Route Parameters
* Uploaded Files

Reject unknown fields.

Reject invalid types.

Reject oversized payloads.

---

# Database Security

Always use Prisma ORM.

Never concatenate SQL.

Avoid raw SQL unless absolutely necessary.

Use database transactions for multi-step operations.

Never physically delete:

* Patients
* Bills
* Payments
* Refunds

Use Soft Delete.

---

# Protected Against

The application must protect against:

* SQL Injection
* NoSQL Injection
* Cross Site Scripting (XSS)
* Server Side Template Injection (SSTI)
* Cross Site Request Forgery (CSRF)
* Replay Attacks
* Regular Expression DoS (ReDoS)
* Large Payload DoS
* Path Traversal
* Clickjacking
* Open Redirect
* Prototype Pollution
* Mass Assignment
* Broken Access Control
* Session Fixation
* Brute Force Login
* Password Spraying
* Duplicate Payment Requests
* Duplicate Refund Requests
* Race Conditions
* Business Logic Abuse
* Secret Leakage
* Clipboard Abuse
* File Upload Abuse

---

# File Upload Rules

Accept only approved file types.

Validate file signatures.

Validate MIME types.

Limit upload size.

Generate random filenames.

Never trust file extensions.

Never execute uploaded files.

---

# Logging

Never log:

* Passwords
* Session IDs
* Secret Keys
* Database Passwords
* Authentication Tokens

Audit all important actions.

---

# Error Handling

Never expose:

* Stack traces
* SQL queries
* Internal file paths
* Environment variables

Return user-friendly error messages.

Log technical details internally.

---

# Secrets

Never hardcode:

* Database URLs
* Secret Keys
* API Keys
* Encryption Keys

Load all secrets from environment variables.

---

# API Rules

Every API must:

* Validate Input
* Authenticate User
* Verify Permission
* Execute Business Logic
* Return Standard Response

No exceptions.

---

# Transactions

Always use database transactions for:

* Patient Registration
* OPD Registration
* IPD Admission
* Billing
* Refunds
* OT Completion
* Birth Registration
* Death Registration
* Pharmacy Sales

Rollback the entire transaction if any step fails.

---

# Final Rule

Security takes priority over convenience.

If an implementation violates these rules, redesign it before coding.
