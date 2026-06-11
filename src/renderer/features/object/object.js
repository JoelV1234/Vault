// Object view orchestrator: header + block editor + contextual side panel.
// This module is the feature's public entry; it re-exports the pieces the
// app shell (renderer.js) needs.
import { el, debounce } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, typeOf, navigate } from '../../shared/state.js';
import { VaultEditor } from './editor.js';
import { buildHeader } from './header.js';
import { renderSidePanel } from './side-panel.js';
import { getActiveEditor, setActiveEditor } from './active-editor.js';

export { getActiveEditor } from './active-editor.js';
export { turnSelectionIntoObject } from './turn-into-object.js';

export async function renderObject(content, route, { setTopbar }) {
  const obj = await window.vault.objects.get(route.id);
  if (!obj) {
    content.replaceChildren(el('div', { class: 'empty-state' }, icon('ghost', 28), el('p', {}, 'This object no longer exists.')));
    return () => {};
  }
  const type = typeOf(obj.type);
  setTopbar(`${type?.name || 'Object'} — ${obj.title}`);

  // ----- debounced persistence -----
  let pendingContent = null;
  const saveContent = debounce(async () => {
    if (pendingContent === null) return;
    const md = pendingContent;
    pendingContent = null;
    await window.vault.objects.update(obj.id, { content: md });
  }, 700);

  const header = buildHeader(obj, type, route);
  const editorHost = el('div', { class: 'editor-host' });
  const page = el('div', { class: 'object-page' }, header, editorHost);
  content.replaceChildren(page);

  // ----- editor -----
  const editor = new VaultEditor({
    root: editorHost,
    content: obj.content,
    types: ctx.types,
    onNavigate: (id) => navigate({ name: 'object', id }),
    onTagNavigate: (tag) => navigate({ name: 'tag', tag }),
    onChange: (md) => { pendingContent = md; saveContent(); },
  });
  setActiveEditor(editor);
  await editor.mount();

  // ----- side panel -----
  renderSidePanel(obj, type, route);

  return async () => {
    if (pendingContent !== null) {
      await window.vault.objects.update(obj.id, { content: pendingContent });
      pendingContent = null;
    }
    const ed = getActiveEditor();
    setActiveEditor(null);
    await ed?.destroy();
  };
}
