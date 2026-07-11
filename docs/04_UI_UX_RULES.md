# UI_UX_RULES.md

# Hospital Management System (HMS v2)

## User Interface & User Experience Standards

---

# Purpose

This document defines the UI and UX standards for HMS v2.

The software is designed primarily for hospital staff working on Windows desktops.

Speed and simplicity are more important than visual effects.

---

# Design Philosophy

The application should feel like professional hospital software.

Avoid unnecessary animations.

Avoid flashy dashboards.

Avoid complex navigation.

The user should complete every task in the fewest possible clicks.

---

# Main Navigation

The application must always use a Menu Bar.

Main Menu:

* OPD
* IPD
* Billing
* OT
* Pharmacy
* Laboratory
* Manage
* Admin

Do not replace this with a sidebar unless explicitly approved.

---

# Home Page

The Home Page should contain only:

* Hospital Logo
* Hospital Name
* Welcome Message
* Hospital Images / Carousel
* Current User
* Current Date
* Software Version

Do not display business dashboards or analytics on the home page.

---

# Theme

Default to a clean Light Theme.

Use professional colors:

* Blue
* White
* Grey

Avoid excessive gradients or decorative effects.

---

# Forms

Every form should:

* Display labels above inputs.
* Clearly indicate required fields.
* Validate immediately after submission.
* Show user-friendly error messages.

Do not use floating labels.

---

# Tables

Every table should support:

* Search
* Sorting
* Pagination
* Sticky Header
* Responsive Column Widths

Action buttons should always appear consistently.

---

# Search

Every major module should allow searching by:

* UHID
* Patient Name
* Phone Number
* Aadhaar Number

Additional IDs (OPD, IPD, OT, Invoice) may be supported where appropriate.

---

# Buttons

Use consistent button colors:

Primary = Blue

Success / Print = Green

Warning = Orange

Delete = Red

Cancel = Grey

---

# Dialogs

Every destructive action must require confirmation.

Examples:

* Delete
* Cancel Bill
* Refund
* Discharge

---

# Keyboard Support

Support common shortcuts where practical:

Enter → Next Field

Tab → Next Field

Shift + Tab → Previous Field

Esc → Close Dialog

Provide additional shortcuts only when they improve efficiency.

---

# Printing

Printing should require minimal interaction:

Preview

↓

Print

All print formats must use the centralized Print Engine.

---

# Performance

Normal pages should load quickly.

Avoid unnecessary network requests.

Avoid unnecessary re-rendering.

Optimize tables and forms for smooth operation.

---

# Error Messages

Messages must be clear.

Good:

"Patient not found."

"Payment already completed."

Bad:

"Unknown Error."

"Something went wrong."

---

# Accessibility

Use readable fonts.

Maintain good color contrast.

Provide adequately sized buttons and controls.

Avoid tiny icons and cramped layouts.

---

# Final Rule

The interface should always prioritize speed, consistency, and ease of use over visual complexity.
