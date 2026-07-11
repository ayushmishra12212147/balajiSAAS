# HMS_WORKFLOW.md

# Hospital Management System (HMS v2)

## Official Business Workflow Specification

---

# Purpose

This document defines every business workflow of HMS v2.

No workflow may be changed without explicit approval.

Every future implementation must follow this document.

---

# System Philosophy

This software is designed for Indian hospitals.

Priority:

1. Speed
2. Simplicity
3. Accuracy
4. Security

Every workflow should minimize mouse clicks.

---

# Navigation

Main Menu

* OPD
* IPD
* Billing
* OT

  * Minor OT
  * Major OT
* Pharmacy
* Laboratory
* Manage
* Admin

No additional top-level menus unless approved.

---

# User Types

Super Admin

Hospital Admin

Employee

Employees receive toggle-based permissions.

Roles are NOT fixed.

Every action can be individually allowed or denied.

---

# Clinical Departments

* Medicine
* Surgery
* Orthopedic
* Pediatrics
* Obstetrics & Gynecology
* ENT
* Ophthalmology
* Psychiatry
* Dermatology
* Emergency
* Dental

Departments are used for doctors and OPD.

They are NOT application modules.

---

# Patient Workflow

Patient Arrives

↓

Search Patient

↓

Existing Patient

OR

Register New Patient

↓

Generate UHID

↓

Continue to selected module

No duplicate patients should be created if sufficient identifying information already exists.

---

# UHID Rules

Format

HospitalCode + RegistrationDate + RunningNumber

Example

ABC26062900001

No spaces.

No hyphens.

Never changes after creation.

---

# OPD Workflow

Register Patient

↓

Generate OPD ID

↓

Collect Deposit (Optional)

↓

Print OPD Slip

↓

Doctor Consultation

↓

Assign Tests

↓

Billing

↓

Patient Leaves

No appointment status tracking.

Cancellation allowed within 3 hours.

Doctor writes prescription manually.

Software stores assigned tests only.

---

# OPD Deposit

Deposit is optional.

Normally consultation fee.

If consultation already paid,

No Due for consultation should not appear.

---

# OPD Billing

Billing occurs before laboratory testing.

Assigned tests remain visible.

Laboratory staff checks payment receipt before performing tests.

System should not block testing.

---

# IPD Workflow

Search Patient

↓

Existing

OR

Register New

↓

Admit Patient

↓

Assign Bed

↓

Generate IPD ID

↓

Assign Charges

↓

Assign Tests

↓

Doctor Changes (History)

↓

Billing

↓

Discharge

↓

Generate Discharge Card

↓

Generate Discharge Summary

---

# Birth Registration

Accessible from IPD.

Generate Birth Record.

Support:

Normal Birth

Cesarean

Still Birth

---

# Death Registration

Can originate from:

Emergency

IPD

Dead on Arrival

Not limited to admitted patients.

---

# Laboratory Workflow

Assign Test

↓

Scheduled Tests

↓

Result Entry

↓

Completed

↓

Print Report

Statuses

Scheduled

Completed

Cancelled

---

# Billing Workflow

Search Patient

↓

Collect Charges

↓

Generate Invoice

↓

Receive Payment

↓

Print Invoice

↓

Generate No Due

Invoices never reset.

Continuous numbering.

Refunds allowed.

Cancelled invoices remain in history.

Charges remain attached.

---

# OT Workflow

Minor OT

Major OT

Workflow

Register OT

↓

Assign Details

↓

Add Charges

↓

Complete Operation

↓

Charges visible in Billing

---

# Pharmacy Workflow

Independent Module.

No dependency on OPD/IPD.

Workflow

New Bill

↓

Medicine Selection

↓

Payment

↓

Print Bill

Supports walk-in customers.

---

# Search Rules

Global Search supports

UHID

Patient Name

Phone Number

Aadhaar Number

OPD ID

IPD ID

OT ID

---

# Reports

Daily OPD

Daily IPD

Today's Billing

Doctor Wise OPD

Department Wise OPD

Laboratory Report

OT Report

Birth Report

Death Report

Pharmacy Sales

Collection Report

---

# Printing

Every printable document must use the Print Engine.

Supported

OPD Slip

Invoice

Receipt

Laboratory Report

Birth Certificate

Death Certificate

Discharge Card

Discharge Summary

Pharmacy Bill

Future

Drag-and-Drop Print Designer

---

# Cancellation Rules

OPD

Within 3 hours.

Lab Test

Before completion only.

Invoice

Can be cancelled.

Charges remain.

OT

Hospital Admin / Super Admin.

IPD

Hospital Admin / Super Admin.

Discharge

Super Admin only.

---

# Editing Rules

Patient personal details editable.

UHID never editable.

Completed OPD doctor never changes.

IPD doctor supports reassignment history.

Department supports referral.

---

# Payment Modes

Cash

UPI

Card

Cheque

Bank Transfer

Future support for split payments.

---

# Refund Rules

Refunds never delete payments.

Refund creates its own transaction.

Every refund is auditable.

---

# Final Workflow Rule

No workflow may be modified without updating this document first.
