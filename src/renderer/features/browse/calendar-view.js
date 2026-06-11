// Calendar renderer: month grid keyed by the type's first date property.
import { el, todayStr } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';

export function renderCalendar(b, list) {
  const { type, state, fields, fieldValue, open } = b;
  const dateField = fields.find((f) => !f.meta && (f.kind === 'date' || f.kind === 'daterange')) ||
    { id: 'created', meta: true, kind: 'date' };
  const dateOf = (o) => {
    let v = fieldValue(o, dateField);
    if (dateField.kind === 'daterange') v = v?.start;
    return v ? String(v).slice(0, 10) : null;
  };
  const byDate = new Map();
  for (const o of list) {
    const d = dateOf(o);
    if (d?.startsWith(state.month)) (byDate.get(d) || byDate.set(d, []).get(d)).push(o);
  }

  const [y, m] = state.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const head = el('div', { class: 'cal-head' },
    el('button', { class: 'icon-btn', 'aria-label': 'Previous month', onclick: () => { shiftMonth(-1); } }, icon('chevron-left', 16)),
    el('h2', {}, monthLabel),
    el('button', { class: 'icon-btn', 'aria-label': 'Next month', onclick: () => { shiftMonth(1); } }, icon('chevron-right', 16)),
    el('span', { class: 'muted small' }, `by ${dateField.name || 'Created'}`));

  function shiftMonth(delta) {
    const d = new Date(y, m - 1 + delta, 1);
    state.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    b.renderBody();
  }

  const grid = el('div', { class: 'cal-grid' },
    ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => el('div', { class: 'cal-dow muted' }, d)));
  for (let i = 0; i < startDow; i++) grid.append(el('div', { class: 'cal-cell cal-empty' }));
  for (let day = 1; day <= daysInMonth; day++) {
    const dstr = `${state.month}-${String(day).padStart(2, '0')}`;
    const items = byDate.get(dstr) || [];
    grid.append(el('div', { class: `cal-cell ${dstr === todayStr() ? 'cal-today' : ''}` },
      el('div', { class: 'cal-day muted' }, String(day)),
      ...items.slice(0, 3).map((o) => el('button', {
        class: 'cal-item truncate', style: `--chip:${type.color}`, onclick: () => open(o.id),
      }, o.title)),
      items.length > 3 ? el('div', { class: 'muted small' }, `+${items.length - 3} more`) : null));
  }
  return el('div', { class: 'cal-wrap' }, head, grid);
}
