// IPC surface: every renderer call goes through here, backed by the store.
const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { todayStr } = require('./store');
const { exportMarkdown, exportJson, exportCsv } = require('./exporter');
const { loadSettings, saveSettings, vaultDir } = require('./settings');
const { getMainWindow, getCaptureWindow } = require('./windows');

const handle = (channel, fn) => ipcMain.handle(channel, (_e, ...args) => fn(...args));

function registerIpc(getStore) {
  const store = () => getStore();

  // types
  handle('types:list', () => store().listTypes());
  handle('types:save', (t) => store().saveType(t));
  handle('types:delete', (id) => store().deleteType(id));
  handle('types:usage', (id) => store().typeUsage(id));
  handle('types:deleteCascade', (id) => store().deleteTypeCascade(id));

  // objects
  handle('objects:list', (opts) => store().list(opts));
  handle('objects:get', (id) => store().get(id));
  handle('objects:create', (data) => store().create(data));
  handle('objects:update', (id, patch) => store().update(id, patch));
  handle('objects:delete', (id) => store().remove(id));

  // links, graph, search
  handle('objects:backlinks', (id) => store().backlinks(id));
  handle('graph:data', () => store().graph());
  handle('search:query', (q, opts) => store().search(q, opts));

  // tags
  handle('tags:all', () => store().allTags());
  handle('tags:objects', (tag) => store().objectsByTag(tag));
  handle('tags:colors', () => store().getTagColors());
  handle('tags:setColor', (name, color) => store().setTagColor(name, color));

  // daily + capture
  handle('daily:ensure', (dateStr) => store().ensureDaily(dateStr || todayStr()));
  handle('daily:append', (text) => {
    const updated = store().appendToDaily(text);
    getMainWindow()?.webContents.send('vault:changed', { id: updated.id });
    return updated;
  });

  // collections
  handle('collections:list', () => store().listCollections());
  handle('collections:save', (c) => store().saveCollection(c));
  handle('collections:delete', (id) => store().deleteCollection(id));

  // templates
  handle('templates:list', (typeId) => store().listTemplates(typeId));
  handle('templates:save', (tpl) => store().saveTemplate(tpl));
  handle('templates:delete', (id) => store().deleteTemplate(id));

  // trash
  handle('trash:list', () => store().listTrash());
  handle('trash:restore', (id) => store().restoreTrash(id));
  handle('trash:destroy', (id) => store().destroyTrash(id));
  handle('trash:empty', () => store().emptyTrash());

  // versions
  handle('versions:list', (id) => store().versions(id));
  handle('versions:get', (id, ts) => store().getVersion(id, ts));
  handle('versions:restore', (id, ts) => store().restoreVersion(id, ts));

  // settings & misc
  handle('settings:get', () => ({ ...loadSettings(), resolvedVaultDir: vaultDir() }));
  handle('settings:set', (patch) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    return { ...next, resolvedVaultDir: vaultDir() };
  });
  handle('vault:openFolder', () => shell.openPath(vaultDir()));
  handle('shell:openExternal', (url) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });

  // assets (images & files into the vault)
  handle('assets:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: [{ name: 'Images & documents', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf'] }],
    });
    if (canceled || !filePaths.length) return null;
    const rel = store().importAsset(filePaths[0]);
    return { rel, abs: path.join(vaultDir(), rel), name: path.basename(filePaths[0]) };
  });

  // import a markdown/text file's content (appended to the current object)
  handle('import:textFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      properties: ['openFile'],
      filters: [{ name: 'Markdown & text', extensions: ['md', 'markdown', 'txt'] }],
    });
    if (canceled || !filePaths.length) return null;
    return { name: path.basename(filePaths[0]), text: fs.readFileSync(filePaths[0], 'utf8') };
  });

  // export
  handle('export:run', async (format) => {
    if (format === 'pdf') {
      const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
        defaultPath: 'vault-object.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) return null;
      // Print the current view; print CSS in the renderer strips app chrome.
      const data = await getMainWindow().webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      fs.writeFileSync(filePath, data);
      return { file: filePath };
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Choose export destination',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (canceled || !filePaths.length) return null;
    const dest = filePaths[0];
    if (format === 'markdown') return exportMarkdown(store(), dest);
    if (format === 'json') return exportJson(store(), dest);
    if (format === 'csv') return exportCsv(store(), dest);
    return null;
  });

  ipcMain.on('capture:submit', (_e, text) => {
    if (text?.trim()) {
      const updated = store().appendToDaily(text);
      getMainWindow()?.webContents.send('vault:changed', { id: updated.id });
    }
    getCaptureWindow()?.close();
  });
  ipcMain.on('capture:cancel', () => getCaptureWindow()?.close());
}

module.exports = { registerIpc };
