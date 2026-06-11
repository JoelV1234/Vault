// Turn the editor's current selection into a new Object (Ctrl/Cmd+Shift+O).
import { el, modal, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, refreshSidebar } from '../../shared/state.js';
import { getActiveEditor } from './active-editor.js';

export function turnSelectionIntoObject() {
  const ed = getActiveEditor();
  if (!ed) return;
  const text = ed.getSelectionText().trim();
  if (!text) { toast('Select some text first', 'warn'); return; }
  const title = text.split('\n')[0].slice(0, 80);

  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted small' }, `"${title}${text.length > 80 ? '…' : ''}"`),
    el('div', { class: 'type-pick-grid' },
      ...ctx.types.filter((t) => t.id !== 'daily').map((t) =>
        el('button', { class: 'type-pick', onclick: async () => {
          const obj = await window.vault.objects.create({ typeId: t.id, title, content: text });
          ed.replaceSelectionWithLink(obj.id, obj.title);
          m.close();
          refreshSidebar();
          toast(`${t.name} created`);
        } },
          el('span', { class: 'type-chip', style: `--chip:${t.color}` }, icon(t.icon, 14)),
          el('span', {}, t.name)))));
  const m = modal({ title: 'Turn into object', body });
}
