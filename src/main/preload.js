const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Enable zoom-in / zoom-out with keyboard Ctrl + +, Ctrl + -, Ctrl + 0 and mouse Ctrl + Wheel
window.addEventListener('DOMContentLoaded', () => {
  // 1. Keyboard Zoom
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        const currentZoom = webFrame.getZoomLevel();
        webFrame.setZoomLevel(currentZoom + 0.5);
      } else if (e.key === '-') {
        e.preventDefault();
        const currentZoom = webFrame.getZoomLevel();
        webFrame.setZoomLevel(currentZoom - 0.5);
      } else if (e.key === '0') {
        e.preventDefault();
        webFrame.setZoomLevel(0);
      }
    }
  });

  // 2. Mouse Wheel Zoom (Ctrl + Wheel)
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const currentZoom = webFrame.getZoomLevel();
      if (e.deltaY < 0) {
        // Scroll Up -> Zoom In
        webFrame.setZoomLevel(currentZoom + 0.2);
      } else if (e.deltaY > 0) {
        // Scroll Down -> Zoom Out
        webFrame.setZoomLevel(currentZoom - 0.2);
      }
    }
  }, { passive: false });
});

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('vault', {
  types: {
    list: invoke('types:list'),
    save: invoke('types:save'),
    delete: invoke('types:delete'),
    usage: invoke('types:usage'),
    deleteCascade: invoke('types:deleteCascade'),
  },
  objects: {
    list: invoke('objects:list'),
    get: invoke('objects:get'),
    create: invoke('objects:create'),
    update: invoke('objects:update'),
    delete: invoke('objects:delete'),
    backlinks: invoke('objects:backlinks'),
  },
  graph: invoke('graph:data'),
  search: invoke('search:query'),
  tags: {
    all: invoke('tags:all'),
    objects: invoke('tags:objects'),
    colors: invoke('tags:colors'),
    setColor: invoke('tags:setColor'),
  },
  daily: { ensure: invoke('daily:ensure'), append: invoke('daily:append') },
  collections: {
    list: invoke('collections:list'),
    save: invoke('collections:save'),
    delete: invoke('collections:delete'),
  },
  templates: {
    list: invoke('templates:list'),
    save: invoke('templates:save'),
    delete: invoke('templates:delete'),
  },
  trash: {
    list: invoke('trash:list'),
    restore: invoke('trash:restore'),
    destroy: invoke('trash:destroy'),
    empty: invoke('trash:empty'),
  },
  importTextFile: invoke('import:textFile'),
  versions: {
    list: invoke('versions:list'),
    get: invoke('versions:get'),
    restore: invoke('versions:restore'),
  },
  settings: { get: invoke('settings:get'), set: invoke('settings:set') },
  openVaultFolder: invoke('vault:openFolder'),
  openExternal: invoke('shell:openExternal'),
  importAsset: invoke('assets:import'),
  exportVault: invoke('export:run'),
  onChanged: (cb) => ipcRenderer.on('vault:changed', (_e, info) => cb(info)),

  // quick-capture window only
  captureSubmit: (text) => ipcRenderer.send('capture:submit', text),
  captureCancel: () => ipcRenderer.send('capture:cancel'),
});
