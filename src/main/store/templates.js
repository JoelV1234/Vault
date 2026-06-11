// Templates: reusable starting content + properties per object type
// (Capacities-style). Stored in templates.json inside the vault.
const crypto = require('crypto');

function listTemplates(store, typeId) {
  return typeId ? store.templates.filter((t) => t.typeId === typeId) : store.templates;
}

function saveTemplate(store, tpl) {
  if (!tpl.id) tpl.id = crypto.randomUUID();
  const i = store.templates.findIndex((t) => t.id === tpl.id);
  if (i >= 0) store.templates[i] = { ...store.templates[i], ...tpl };
  else store.templates.push(tpl);
  store.writeJson('templates.json', store.templates);
  return tpl;
}

function deleteTemplate(store, id) {
  store.templates = store.templates.filter((t) => t.id !== id);
  store.writeJson('templates.json', store.templates);
}

module.exports = { listTemplates, saveTemplate, deleteTemplate };
