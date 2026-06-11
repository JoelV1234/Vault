// Kanban renderer: columns from the type's first Select property, drag to move.
import { el, fmtDate } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';

export function renderKanban(b, list) {
  const { type, open } = b;
  const statusProp = type.props.find((p) => p.kind === 'select');
  if (!statusProp) {
    return el('div', { class: 'empty-state' }, icon('square-kanban', 26),
      el('p', { class: 'muted' }, `Add a Select property to "${type.name}" to use Kanban.`));
  }
  const cols = [...(statusProp.options || []), null]; // null = "No status"
  const board = el('div', { class: 'kanban-board' });
  for (const colVal of cols) {
    const items = list.filter((o) => (o.props[statusProp.id] || null) === colVal);
    const colBody = el('div', {
      class: 'kanban-col-body',
      ondragover: (e) => { e.preventDefault(); colBody.classList.add('drop'); },
      ondragleave: () => colBody.classList.remove('drop'),
      ondrop: async (e) => {
        e.preventDefault();
        colBody.classList.remove('drop');
        const id = e.dataTransfer.getData('text/vault-id');
        if (!id) return;
        await window.vault.objects.update(id, { props: { [statusProp.id]: colVal } });
        await b.refresh();
      },
    }, items.map((o) => el('div', {
      class: 'kanban-card lift', draggable: 'true', tabindex: '0', role: 'button',
      ondragstart: (e) => {
        e.dataTransfer.setData('text/vault-id', o.id);
        e.currentTarget.classList.add('dragging');
      },
      ondragend: (e) => e.currentTarget.classList.remove('dragging'),
      onclick: () => open(o.id),
      onkeydown: (e) => e.key === 'Enter' && open(o.id),
    }, el('div', { class: 'card-title' }, o.title), el('div', { class: 'muted small' }, fmtDate(o.updated)))));

    board.append(el('div', { class: 'kanban-col' },
      el('div', { class: 'kanban-col-head' },
        el('span', {}, colVal || 'No status'),
        el('span', { class: 'count-badge' }, String(items.length))),
      colBody));
  }
  return board;
}
