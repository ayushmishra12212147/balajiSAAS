# Shreeganesha HMS — Production Deployment Guide

## Version 2.0.0

---

## System Requirements

| Component | Minimum Requirement |
|---|---|
| **Operating System** | Windows 10 (64-bit) or later |
| **PostgreSQL** | 14.0 or later |
| **RAM** | 4 GB |
| **Disk Space** | 2 GB free |
| **Display** | 1024 × 700 minimum resolution |

---

## Installation

### Interactive Install

1. Download or copy `Shreeganesha-HMS-Setup-2.0.0.exe` to the target machine.
2. Run the installer.
3. Follow the installation wizard:
   - Accept the license agreement.
   - Choose installation directory (default: `C:\Program Files\Shreeganesha HMS`).
   - Select shortcut options (Desktop, Start Menu).
4. Click **Install** and wait for completion.
5. Launch from Desktop shortcut or Start Menu.

### Silent Install (IT Administrators)

For mass deployment without user interaction:

```batch
Shreeganesha-HMS-Setup-2.0.0.exe /S /D=C:\Program Files\Shreeganesha HMS
```

**Flags:**
- `/S` — Silent mode (no UI).
- `/D=<path>` — Installation directory (must be last parameter).

### Silent Uninstall

```batch
"C:\Program Files\Shreeganesha HMS\Uninstall Shreeganesha HMS.exe" /S
```

---

## First-Run Setup

On the first launch, the Setup Wizard will guide you through:

### Step 1: Hospital Name
Enter the name of your hospital. This is used in reports and print headers.

### Step 2: Database Configuration
Configure your PostgreSQL connection:

| Field | Description | Default |
|---|---|---|
| Host | PostgreSQL server address | `localhost` |
| Port | PostgreSQL port | `5432` |
| Username | Database user | `postgres` |
| Password | Database password | *(required)* |
| Database | Database name | `hms` |

> **Important:** The database must already exist. Create it manually if needed:
> ```sql
> CREATE DATABASE hms;
> ```

### Step 3: Test Connection
The wizard verifies TCP connectivity to the PostgreSQL server.

### Step 4: Run Migrations
Creates all required database tables, indexes, and constraints.

### Step 5: Seed Default Data
Inserts default roles, permissions, departments, and configuration values.

### Step 6: Super Admin Account
Configure the initial administrator login credentials.

### Step 7: Launch
The setup is complete. HMS will redirect to the login page.

---

## Configuration

### Encrypted Storage

All configuration (including database credentials) is encrypted at rest using:
- **Windows**: DPAPI (Data Protection API) — tied to the Windows user profile.

The encrypted config file is stored at:
```
%APPDATA%\shreeganesha-hms\hms-config.enc
```

This file is:
- ✅ Encrypted — cannot be read as plaintext.
- ✅ User-specific — tied to the Windows login.
- ✅ Hardware-portable — survives hardware replacement.
- ❌ Not transferable between Windows user accounts.

### Reconfiguring

To reconfigure HMS:
1. Delete the config file at the path above.
2. Restart HMS.
3. The Setup Wizard will reappear.

---

## Backup & Restore

### Creating Backups

1. Login as Super Admin.
2. Navigate to **Admin → System Administration → Backups**.
3. Click **Full Backup** or **Incremental Backup**.

Backups include:
- PostgreSQL native dump (`pg_dump`).
- Uploaded files (ZIP archive).
- Print templates and settings (JSON).
- SHA-256 integrity checksum.

### Restoring from Backup

1. Navigate to **Admin → System Administration → Backups**.
2. Click **Restore** on the desired backup.
3. Review the backup preview (file name, checksum, creation date).
4. Confirm the restore.

> **Safety:** A pre-restore snapshot is automatically created before any restore operation.

---

## Updating HMS

### Offline Update (Recommended)

1. Obtain the new installer from the HMS distribution package.
2. Close HMS.
3. Run the new installer. It will upgrade in-place.
4. Launch HMS. Migrations will run automatically if needed.

### USB/Network Update (Future)

Place the installer and `update-manifest.json` in:
```
%APPDATA%\shreeganesha-hms\updates\
```

HMS will detect the update on next launch.

---

## Logging

### Log Locations

| Log Type | Path |
|---|---|
| Application Events | `%APPDATA%\shreeganesha-hms\logs\app-{date}.log` |
| Server Output | `%APPDATA%\shreeganesha-hms\logs\server-{date}.log` |
| Crash Reports | `%APPDATA%\shreeganesha-hms\logs\crash-{timestamp}.json` |

### Log Rotation

Logs are automatically rotated on startup:
- Files older than **30 days** are deleted.
- If total log size exceeds **100 MB**, oldest files are deleted first.

### Exporting Logs

From the crash recovery screen or system diagnostics:
1. Click **Export Logs**.
2. Choose a destination folder.
3. All log files are copied to the selected location.

---

## Environment Report

Generate a diagnostic report for troubleshooting:

1. Login as Super Admin.
2. Navigate to **Admin → System Administration → Telemetry**.

The report includes:
- HMS Version
- Electron Version
- Node.js Version
- PostgreSQL Version
- Prisma Version
- OS Version & Architecture
- Memory Usage
- Disk Space

---

## Troubleshooting

### HMS won't start

1. Check if PostgreSQL is running.
2. Verify the database credentials in the encrypted config.
3. Check the logs at `%APPDATA%\shreeganesha-hms\logs\`.
4. Delete `hms-config.enc` and re-run the Setup Wizard.

### Database connection failed

1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`.
2. Verify the database exists: `psql -l`.
3. Check firewall rules if using a remote database.

### Crash on startup

1. Check `crash-*.json` files in the logs directory.
2. Export logs and share with support.
3. Try **Reconfigure** from the crash recovery screen.

### Migration errors

1. Ensure PostgreSQL user has CREATE/ALTER permissions.
2. Check for conflicting schema changes.
3. Run `npx prisma migrate deploy` manually from the installation directory.

### Print not working

1. Verify a printer is configured in Windows.
2. HMS uses the native Windows print dialog — check printer availability there.
3. Ensure the Print Engine templates are published (Admin → Print Templates).

---

## Security Notes

- **Node Integration**: Disabled in Electron.
- **Context Isolation**: Enabled.
- **Sandbox**: Enabled.
- **Remote Module**: Disabled.
- **IPC Channels**: Restricted — only business-level APIs are exposed.
- **Configuration**: Encrypted with DPAPI.
- **Server**: Runs on localhost only — not accessible from network.

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│           Electron Shell                │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Main       │  │ Preload          │   │
│  │ Process    │  │ (contextBridge)  │   │
│  │            │  │                  │   │
│  │ • Config   │  │ • Business APIs  │   │
│  │ • Server   │  │ • No IPC details │   │
│  │ • Crash    │  │                  │   │
│  │ • Update   │  └──────────────────┘   │
│  └─────┬──────┘                         │
│        │ HTTP only                      │
│  ┌─────▼──────────────────────────────┐ │
│  │    Next.js Standalone Server       │ │
│  │    (Business Logic, API, UI)       │ │
│  │    localhost:{dynamic-port}        │ │
│  └─────┬──────────────────────────────┘ │
│        │                                │
│  ┌─────▼──────────────────────────────┐ │
│  │    PostgreSQL Database             │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

Electron is a thin shell. All business logic stays in Next.js.
Communication between Electron and HMS is HTTP-only.
