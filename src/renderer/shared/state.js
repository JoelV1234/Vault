// Shared app state + tiny router. Views subscribe via onNavigate; renderer.js
// owns the actual rendering dispatch.
export const ctx = {
  types: [],
  collections: [],
  settings: {},
  route: null,
};

const navListeners = new Set();
const sidebarListeners = new Set();

export const typeOf = (id) => ctx.types.find((t) => t.id === id);

export async function loadCore() {
  const [types, collections, settings] = await Promise.all([
    window.vault.types.list(),
    window.vault.collections.list(),
    window.vault.settings.get(),
  ]);
  ctx.types = types;
  ctx.collections = collections;
  ctx.settings = settings;
}

const history = [];

export function navigate(route, { push = true } = {}) {
  if (push && ctx.route) {
    history.push(ctx.route);
    if (history.length > 50) history.shift();
  }
  ctx.route = route;
  for (const fn of navListeners) fn(route);
}

export function goBack() {
  const prev = history.pop();
  if (prev) {
    ctx.route = prev;
    for (const fn of navListeners) fn(prev);
  } else {
    navigate({ name: 'home' }, { push: false });
  }
}

export const onNavigate = (fn) => navListeners.add(fn);

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
