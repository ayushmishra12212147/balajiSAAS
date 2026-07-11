/**
 * Electron Main Process — HMS Desktop Application
 *
 * Strict startup sequence:
 *  1. Load Config
 *  2. Validate Config
 *  3. Start Embedded Server
 *  4. Health Check (process + HTTP + DB)
 *  5. License Check
 *  6. Open Main Window
 *
 * Security: nodeIntegration=false, contextIsolation=true, sandbox=true.
 * Communication with HMS is HTTP-only — never imports business modules.
 */

import { app, BrowserWindow, Menu } from "electron";
import * as path from "path";
import { ConfigManager } from "./config-manager";
import { ServerManager } from "./server-manager";
import { CrashHandler } from "./crash-handler";
import { DeploymentToolkit } from "./deployment-toolkit";
import { registerIpcHandlers } from "./ipc-handlers";

// ── Globals ─────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
const configManager = new ConfigManager();
const serverManager = new ServerManager();
const crashHandler = new CrashHandler();
const toolkit = new DeploymentToolkit(configManager);

// ── Window Creation ─────────────────────────────────────────────────────

function createWindow(url: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false, // Don't show until fully ready
    title: "Balaji HMS",
    icon: getIconPath(),
    backgroundColor: "#020617", // slate-950
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      autoplayPolicy: "user-gesture-required",
    },
  });

  // Remove default menu bar
  Menu.setApplicationMenu(null);

  // Show window when ready to prevent visual flash
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  // Handle window close
  win.on("closed", () => {
    mainWindow = null;
  });

  // Attach crash handlers to the window
  crashHandler.attachToWindow(win);

  // Load the URL
  win.loadURL(url);

  return win;
}

/**
 * Get the application icon path.
 */
function getIconPath(): string | undefined {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app", "public", "favicon.ico");
  }
  const devIcon = path.join(process.cwd(), "public", "favicon.ico");
  const fs = require("fs") as typeof import("fs");
  return fs.existsSync(devIcon) ? devIcon : undefined;
}

// ── Startup Sequence ────────────────────────────────────────────────────

async function startApplication(): Promise<void> {
  // Step 0: Initialize crash handlers and log rotation
  crashHandler.initialize();
  crashHandler.logEvent("startup", "Beginning HMS startup sequence...");

  // Register IPC handlers (available even before server starts — needed for setup wizard)
  registerIpcHandlers(configManager, serverManager, crashHandler, toolkit);

  // Step 1: Load Config
  crashHandler.logEvent("startup", "Step 1: Loading configuration...");
  const isFirstRun = !configManager.isSetupComplete();

  if (isFirstRun) {
    // First run — start server with defaults for setup wizard
    crashHandler.logEvent("startup", "First run detected. Launching setup wizard...");
    await startServerAndOpenWindow("/setup");
    return;
  }

  // Step 2: Validate Config
  crashHandler.logEvent("startup", "Step 2: Validating configuration...");
  const config = configManager.loadConfig();

  if (!config.database.host || !config.database.database) {
    crashHandler.logEvent("startup", "Invalid config. Launching setup wizard...");
    await startServerAndOpenWindow("/setup");
    return;
  }

  // Update last startup timestamp
  configManager.updateConfig({
    app: { ...config.app, lastStartup: new Date().toISOString() },
  });

  // Step 3-4-5: Start server, health check, open window
  await startServerAndOpenWindow("/");
}

/**
 * Start the embedded server and open the main window.
 * Handles the full startup sequence from server start to window open.
 */
async function startServerAndOpenWindow(initialPath: string): Promise<void> {
  const config = configManager.loadConfig();
  const databaseUrl = configManager.getDatabaseUrl();

  // Generate a session secret if not in environment
  const sessionSecret =
    process.env.SESSION_SECRET ||
    require("crypto").randomBytes(64).toString("hex");

  try {
    // Step 3: Start Embedded Server
    crashHandler.logEvent("startup", "Step 3: Starting embedded server...");
    const port = await serverManager.startServer(
      databaseUrl,
      sessionSecret,
      config.server.port || undefined
    );

    crashHandler.logEvent("startup", `Server started on port ${port}`);

    // Step 4: Health Check (triple verification done inside startServer)
    crashHandler.logEvent("startup", "Step 4: Health check passed.");

    // Step 5: License Check (via HTTP API — Electron never imports business modules)
    if (initialPath !== "/setup") {
      crashHandler.logEvent("startup", "Step 5: Checking license...");
      try {
        const http = require("http") as typeof import("http");
        await new Promise<void>((resolve) => {
          const req = http.get(
            `http://127.0.0.1:${port}/api/admin/license`,
            { timeout: 5000 },
            (res: import("http").IncomingMessage) => {
              let body = "";
              res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
              res.on("end", () => {
                try {
                  const license = JSON.parse(body);
                  if (license.isExpired) {
                    crashHandler.logEvent("startup", "License expired — user will see warning in HMS UI.");
                  }
                } catch {
                  // License check response parse failed — proceed anyway
                }
                resolve();
              });
            }
          );
          req.on("error", () => resolve()); // License check failed — proceed anyway
          req.on("timeout", () => { req.destroy(); resolve(); });
        });
      } catch {
        // License check failed — HMS UI will handle the warning
        crashHandler.logEvent("startup", "License check skipped — will be handled by HMS UI.");
      }
    }

    // Step 6: Open Main Window
    crashHandler.logEvent("startup", "Step 6: Opening main window...");
    const baseUrl = `http://127.0.0.1:${port}`;
    mainWindow = createWindow(`${baseUrl}${initialPath}`);

    crashHandler.logEvent("startup", "HMS startup complete.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    crashHandler.logEvent("startup-error", `Server start failed: ${message}`);
    crashHandler.recordServerCrash("Startup failure", message);

    // Show crash recovery page if server is somehow running
    if (serverManager.getIsRunning()) {
      const port = serverManager.getPort();
      mainWindow = createWindow(`http://127.0.0.1:${port}/crash`);
    } else {
      // Server didn't start at all — show a basic error window
      mainWindow = createWindow("about:blank");
      mainWindow.once("ready-to-show", () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            document.body.style.cssText = 'background:#020617;color:#f1f5f9;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0';
            document.body.innerHTML = '<div style="text-align:center;max-width:400px"><h1 style="color:#ef4444;font-size:24px">HMS Server Failed to Start</h1><p style="color:#94a3b8;margin-top:16px">${message.replace(/'/g, "\\'")}</p><p style="color:#64748b;margin-top:24px;font-size:12px">Check logs at: ${app.getPath("userData").replace(/\\/g, "\\\\")}/logs/</p></div>';
          `).catch(() => {});
        }
      });
    }
  }

  // Listen for fatal server crashes after startup
  serverManager.on("fatal", (details: { message: string }) => {
    crashHandler.logEvent("fatal-crash", details.message);
    crashHandler.recordServerCrash("Fatal crash after restart", details.message);

    // Navigate to crash page if main window exists
    if (mainWindow && serverManager.getIsRunning()) {
      const port = serverManager.getPort();
      mainWindow.loadURL(`http://127.0.0.1:${port}/crash`);
    }
  });
}

// ── App Lifecycle ───────────────────────────────────────────────────────

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Focus existing window if user opens a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startApplication);

  app.on("window-all-closed", async () => {
    crashHandler.logShutdown();
    await serverManager.stopServer();
    app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverManager.getIsRunning()) {
      const port = serverManager.getPort();
      mainWindow = createWindow(`http://127.0.0.1:${port}/`);
    }
  });

  app.on("before-quit", async () => {
    crashHandler.logShutdown();
    await serverManager.stopServer();
  });
}
