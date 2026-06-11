// Trash browser: restore deleted objects or destroy them permanently.
import { el, modal, toast, fmtDateTime, confirmDialog } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { typeOf, navigate, refreshSidebar } from '../../shared/state.js';

export async function openTrash() {
  const list = el('div', { class: 'tpl-list' });

  const render = async () => {
    const items = await window.vault.trash.list();
    list.replaceChildren(...(items.length
      ? items.map((o) => {
        const t = typeOf(o.type);
        return el('div', { class: 'tpl-row' },
          el('span', { class: 'type-chip', style: `--chip:${t?.color || '#888'}` }, icon(t?.icon || 'file-text', 12)),
          el('span', { class: 'truncate' }, o.title),
          el('span', { class: 'muted small' }, fmtDateTime(o.deletedAt)),
          el('div', { class: 'flex-spacer' }),
          el('button', {
            class: 'btn btn-small', title: 'Restore',
            onclick: async () => {
              const restored = await window.vault.trash.restore(o.id);
              refreshSidebar();
              toast('Object restored');
              if (restored) { m.close(); navigate({ name: 'object', id: restored.id }); }
            },
          }, 'Restore'),
          el('button', {
            class: 'icon-btn', 'aria-label': `Delete ${o.title} forever`, title: 'Delete forever',
            onclick: async () => {
              if (await confirmDialog(`Permanently delete "${o.title}"? This cannot be undone.`)) {
                await window.vault.trash.destroy(o.id);
                render();
              }
            },
          }, icon('trash-2', 14)));
      })
      : [el('p', { class: 'muted small' }, 'Trash is empty.')]));
  };
  await render();

  const body = el('div', { class: 'modal-body' },
    list,
    el('div', { class: 'modal-actions' },
      el('button', {
        class: 'btn btn-danger',
        onclick: async () => {
          if (await confirmDialog('Permanently delete everything in the trash?', 'Empty trash')) {
            const n = await window.vault.trash.empty();
            toast(`${n} item${n === 1 ? '' : 's'} deleted forever`);
            render();
          }
        },
      }, 'Empty trash')));

  const m = modal({ title: 'Trash', body, wide: true });
}
