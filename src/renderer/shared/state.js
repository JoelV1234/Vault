// App-facing state API, backed by the Redux store in store.js.
// `ctx` is a read-only mirror kept in sync after every dispatch; all writes
// go through the action helpers here so every part of the app stays fresh.
import { store, observe } from './store.js';

export const ctx = {
  types: [],
  collections: [],
  settings: {},
  route: null,
};

// Transient UI state mirror (sidePanelOpen etc.).
export const ui = { sidePanelOpen: true, sidebarCollapsed: false };

const syncCtx = () => {
  const s = store.getState();
  ctx.types = s.data.types;
  ctx.collections = s.data.collections;
  ctx.settings = s.data.settings;
  ctx.route = s.router.route;
  ui.sidePanelOpen = s.ui.sidePanelOpen;
  ui.sidebarCollapsed = s.ui.sidebarCollapsed;
};
store.subscribe(syncCtx);

const navListeners = new Set();
const sidebarListeners = new Set();
const dataListeners = new Set();

// Route changes fan out to navListeners (renderer.js renders the view).
observe((s) => s.router.route, (route) => {
  for (const fn of [...navListeners]) fn(route);
});
// Data slice changes fan out with the kind that changed.
observe((s) => s.data, (next, prev) => {
  for (const key of ['types', 'collections', 'settings']) {
    if (next[key] !== prev[key]) for (const fn of [...dataListeners]) fn(key);
  }
});

export const typeOf = (id) => ctx.types.find((t) => t.id === id);

export async function loadCore() {
  const [types, collections, settings] = await Promise.all([
    window.vault.types.list(),
    window.vault.collections.list(),
    window.vault.settings.get(),
  ]);
  store.dispatch({ type: 'data/typesLoaded', payload: types });
  store.dispatch({ type: 'data/collectionsLoaded', payload: collections });
  store.dispatch({ type: 'data/settingsLoaded', payload: settings });
}

// ---------- data actions ----------
export async function reloadTypes() {
  store.dispatch({ type: 'data/typesLoaded', payload: await window.vault.types.list() });
}
export async function reloadCollections() {
  store.dispatch({ type: 'data/collectionsLoaded', payload: await window.vault.collections.list() });
}
export function setSettings(settings) {
  store.dispatch({ type: 'data/settingsLoaded', payload: settings });
}
// Broadcast that objects changed (no cached list in the store; views re-query).
export function emitObjectsChanged() {
  for (const fn of [...dataListeners]) fn('objects');
}
export function onDataChanged(fn) {
  dataListeners.add(fn);
  return () => dataListeners.delete(fn);
}

// ---------- router ----------
export function navigate(route, { push = true } = {}) {
  store.dispatch({ type: 'router/navigated', payload: route, push });
}
export function goBack() {
  if (store.getState().router.back.length) store.dispatch({ type: 'router/wentBack' });
  else navigate({ name: 'home' }, { push: false });
}
export function goForward() {
  store.dispatch({ type: 'router/wentForward' });
}
export const canGoBack = () => store.getState().router.back.length > 0;
export const canGoForward = () => store.getState().router.fwd.length > 0;
export const onNavigate = (fn) => navListeners.add(fn);

// ---------- ui: side panel + sidebar ----------
export function setSidePanelOpen(open) {
  store.dispatch({ type: 'ui/sidePanelSet', payload: open });
}
export function setSidebarCollapsed(collapsed) {
  store.dispatch({ type: 'ui/sidebarCollapsedSet', payload: collapsed });
}
export const onUiChanged = (fn) => observe((s) => s.ui, () => fn(ui));

// ---------- object tabs ----------
export function openObjectTab(tab) {
  store.dispatch({ type: 'tabs/upsert', payload: tab });
}
export function setTabTitle(id, title) {
  store.dispatch({ type: 'tabs/title', id, title });
}
export function closeTab(id) {
  store.dispatch({ type: 'tabs/close', id });
}
export function moveTab(id, beforeId) {
  store.dispatch({ type: 'tabs/move', id, beforeId });
}
export function toggleTabPin(id) {
  store.dispatch({ type: 'tabs/pin', id });
}
export const getTabs = () => store.getState().tabs;
export const onTabsChanged = (fn) => observe((s) => s.tabs, () => fn());

// ---------- sidebar ----------
export function refreshSidebar() {
  for (const fn of sidebarListeners) fn();
}
export const onSidebarRefresh = (fn) => sidebarListeners.add(fn);

export function applyTheme(settings) {
  const html = document.documentElement;
  html.dataset.theme = settings.theme || 'dark';
  html.dataset.accent = settings.accent || 'indigo';
  html.dataset.contrast = settings.highContrast ? 'high' : 'normal';
}
