/**
 * Electron Builder Configuration
 *
 * Defines the packaging configuration for building
 * the Shreeganesha HMS Windows desktop installer.
 *
 * Supports silent install/uninstall for IT administrator deployments.
 *
 * Note: This file is for reference. The actual build config
 * is embedded in package.json under the "build" key, which
 * electron-builder reads automatically.
 *
 * To build: npm run electron:build
 * To pack (no installer): npm run electron:pack
 */

/**
 * electron-builder configuration reference.
 * This mirrors what's in package.json "build" section.
 */
export const builderConfig = {
  appId: "com.balaji.hms",
  productName: "Balaji HMS",
  copyright: "Copyright © 2026 Balaji HMS",

  directories: {
    output: "release",
  },

  // Main process and preload files
  files: [
    "dist-electron/**/*",
    "!node_modules",
  ],

  // Resources bundled alongside the app
  extraResources: [
    // Next.js standalone server
    {
      from: ".next/standalone",
      to: "app",
      filter: ["**/*"],
    },
    // Next.js static assets
    {
      from: ".next/static",
      to: "app/.next/static",
      filter: ["**/*"],
    },
    // Public assets
    {
      from: "public",
      to: "app/public",
      filter: ["**/*"],
    },
    // Prisma schema and migrations
    {
      from: "prisma",
      to: "prisma",
      filter: ["**/*"],
    },
    // Prisma engine binaries
    {
      from: "node_modules/.prisma",
      to: "prisma-engine",
      filter: ["**/*"],
    },
  ],

  // Windows-specific configuration
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    icon: "public/favicon.ico",
  },

  // NSIS installer configuration
  nsis: {
    // NOT one-click — shows installation wizard
    oneClick: false,

    // Allow elevation for per-machine install
    allowElevation: true,

    // Install for all users (per-machine)
    perMachine: true,

    // Allow changing install directory
    allowToChangeInstallationDirectory: true,

    // Desktop shortcut
    createDesktopShortcut: true,

    // Start menu shortcut
    createStartMenuShortcut: true,
    shortcutName: "Shreeganesha HMS",

    // Icons
    installerIcon: "public/favicon.ico",
    uninstallerIcon: "public/favicon.ico",

    // Uninstall display name in Programs & Features
    uninstallDisplayName: "Shreeganesha HMS",

    // Silent install supported via /S flag
    // Silent uninstall supported via /S flag
    // Example: Shreeganesha-HMS-Setup-2.0.0.exe /S
  },
};
