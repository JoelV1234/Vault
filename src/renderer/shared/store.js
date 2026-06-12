// Redux store: single source of truth for app data, routing, and UI state.
// state.js wraps this with the app-facing API (ctx, navigate, reload*…).
import { legacy_createStore as createStore, combineReducers } from 'redux';

const data = (state = { types: [], collections: [], settings: {} }, action) => {
  switch (action.type) {
    case 'data/typesLoaded': return { ...state, types: action.payload };
    case 'data/collectionsLoaded': return { ...state, collections: action.payload };
    case 'data/settingsLoaded': return { ...state, settings: action.payload };
    default: return state;
  }
};

// Route history lives in the store so back/forward state is inspectable.
const router = (state = { route: null, back: [], fwd: [] }, action) => {
  switch (action.type) {
    case 'router/navigated': {
      const back = action.push && state.route
        ? [...state.back.slice(-49), state.route]
        : state.back;
      return { route: action.payload, back, fwd: action.push ? [] : state.fwd };
    }
    case 'router/wentBack': {
      if (!state.back.length) return state;
      return {
        route: state.back[state.back.length - 1],
        back: state.back.slice(0, -1),
        fwd: [...state.fwd, state.route],
      };
    }
    case 'router/wentForward': {
      if (!state.fwd.length) return state;
      return {
        route: state.fwd[state.fwd.length - 1],
        fwd: state.fwd.slice(0, -1),
        back: [...state.back, state.route],
      };
    }
    default: return state;
  }
};

const ui = (state = { sidePanelOpen: true, sidebarCollapsed: false }, action) => {
  switch (action.type) {
    case 'ui/sidePanelSet': return { ...state, sidePanelOpen: !!action.payload };
    case 'ui/sidebarCollapsedSet': return { ...state, sidebarCollapsed: !!action.payload };
    default: return state;
  }
};

// Open object tabs (browser-style strip in the topbar). Pinned tabs always
// sit first and never count against the cap; the oldest unpinned tab is
// dropped when the strip fills up.
const pinnedFirst = (list) => [...list.filter((x) => x.pinned), ...list.filter((x) => !x.pinned)];

const tabs = (state = [], action) => {
  switch (action.type) {
    case 'tabs/upsert': {
      const t = action.payload;
      const i = state.findIndex((x) => x.id === t.id);
      if (i >= 0) {
        const next = [...state];
        next[i] = { ...next[i], ...t };
        return next;
      }
      const next = [...state, t];
      const unpinned = next.filter((x) => !x.pinned);
      if (unpinned.length > 8) return next.filter((x) => x.id !== unpinned[0].id);
      return next;
    }
    case 'tabs/title':
      return state.map((x) => (x.id === action.id ? { ...x, title: action.title } : x));
    case 'tabs/close':
      return state.filter((x) => x.id !== action.id);
    case 'tabs/move': {
      const src = state.find((x) => x.id === action.id);
      if (!src) return state;
      const rest = state.filter((x) => x.id !== action.id);
      let i = action.beforeId ? rest.findIndex((x) => x.id === action.beforeId) : rest.length;
      if (i < 0) i = rest.length;
      rest.splice(i, 0, src);
      return pinnedFirst(rest);
    }
    case 'tabs/pin':
      return pinnedFirst(state.map((x) => (x.id === action.id ? { ...x, pinned: !x.pinned } : x)));
    default: return state;
  }
};

export const store = createStore(combineReducers({ data, router, ui, tabs }));

// Subscribe with slice-level change detection: fn(nextState, prevState) is
// called only when `select(state)` returns a different reference.
export function observe(select, fn) {
  let prev = select(store.getState());
  return store.subscribe(() => {
    const next = select(store.getState());
    if (next !== prev) {
      const old = prev;
      prev = next;
      fn(next, old);
    }
  });
}
