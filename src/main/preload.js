const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('vault', {
  types: {
    list: invoke('types:list'),
    save: invoke('types:save'),
    delete: invoke('types:delete'),
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
