// Electron main-process entry: boots the store, IPC, menu, and windows.
const { app, BrowserWindow, globalShortcut } = require('electron');
const fs = require('fs');
const { VaultStore } = require('./store');
const { vaultDir } = require('./settings');
const { createWindow, openQuickCapture } = require('./windows');
const { registerIpc: registerIpcImpl } = require('./ipc');
const { buildMenu } = require('./menu');

let store = null;

function initStore() {
  const dir = vaultDir();
  fs.mkdirSync(dir, { recursive: true });
  store = new VaultStore(dir);
  store.init();
  return store;
}

const registerIpc = () => registerIpcImpl(() => store);

function boot() {
  app.whenReady().then(() => {
    initStore();
    registerIpc();
    buildMenu();
    createWindow();

    // Quick capture from anywhere on the desktop.
    globalShortcut.register('CommandOrControl+Shift+Space', openQuickCapture);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Exported for the smoke-test harness (VAULT_SMOKE skips auto-boot).
module.exports = { initStore, registerIpc, createWindow, boot };
if (!process.env.VAULT_SMOKE) boot();
