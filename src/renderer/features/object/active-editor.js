// Holder for the currently mounted editor instance (one object page at a time).
let activeEditor = null;

export const getActiveEditor = () => activeEditor;
export const setActiveEditor = (ed) => { activeEditor = ed; };
