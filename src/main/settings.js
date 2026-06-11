// App settings live outside the vault (in userData) so they can point at it.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const defaultSettings = { theme: 'dark', accent: 'indigo', highContrast: false, vaultDir: null };

function loadSettings() {
  try { return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) }; }
  catch { return { ...defaultSettings }; }
}

function saveSettings(s) {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2));
}

function vaultDir() {
  const s = loadSettings();
  return s.vaultDir || process.env.VAULT_DIR || path.join(app.getPath('documents'), 'Vault');
}

module.exports = { loadSettings, saveSettings, vaultDir };
