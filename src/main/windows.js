// Window management: the main app window and the quick-capture popup.
const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;
let captureWindow = null;

const getMainWindow = () => mainWindow;
const getCaptureWindow = () => captureWindow;

function createWindow({ hidden = false } = {}) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 720,
    minHeight: 480,
    title: 'Vault',
    backgroundColor: '#101012',
    show: !hidden,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      ...(hidden ? { offscreen: true } : {}),
    },
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow;
}

function openQuickCapture() {
  if (captureWindow) { captureWindow.focus(); return; }
  captureWindow = new BrowserWindow({
    width: 560,
    height: 200,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#101012',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  captureWindow.loadFile('quick-capture.html');
  captureWindow.on('blur', () => captureWindow?.close());
  captureWindow.on('closed', () => { captureWindow = null; });
}

module.exports = { createWindow, openQuickCapture, getMainWindow, getCaptureWindow };
