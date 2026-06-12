// Task overview: Overdue / Today / Upcoming / Someday / Done, with quick add.
import { el, fmtDate, todayStr, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { navigate, typeOf } from '../../shared/state.js';

export async function renderTasks(content, _route, { setTopbar }) {
  setTopbar('Tasks');

  const host = el('div', { class: 'tasks-page' });
  content.replaceChildren(host);
  await draw();

  async function draw() {
    const tasks = await window.vault.objects.list({ typeId: 'task' });
    const today = todayStr();
    const groups = { Overdue: [], Today: [], Upcoming: [], Someday: [], Done: [] };
    for (const t of tasks) {
      if (t.props.done) groups.Done.push(t);
      else if (!t.props.due) groups.Someday.push(t);
      else if (t.props.due < today) groups.Overdue.push(t);
      else if (t.props.due === today) groups.Today.push(t);
      else groups.Upcoming.push(t);
    }
    groups.Upcoming.sort((a, b) => (a.props.due < b.props.due ? -1 : 1));

    const quickAdd = el('input', {
      class: 'capture-input', placeholder: 'New task… (Enter to add)', 'aria-label': 'New task',
      onkeydown: async (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          await window.vault.objects.create({ typeId: 'task', title: e.target.value.trim() });
          toast('Task added');
          await draw();
        }
      },
    });

    const sections = Object.entries(groups)
      .filter(([name, items]) => items.length || ['Today', 'Upcoming'].includes(name))
      .map(([name, items]) => el('div', { class: `task-group ${name === 'Done' ? 'task-done-group' : ''}` },
        el('h2', { class: 'home-h2' }, name, el('span', { class: 'count-badge' }, String(items.length))),
        items.length
          ? el('div', { class: 'obj-list' }, items.map(taskRow))
          : el('p', { class: 'muted small' }, name === 'Today' ? 'Nothing due today.' : 'Nothing scheduled.')));

    host.replaceChildren(el('h1', { class: 'home-greeting' }, 'Tasks'), quickAdd, ...sections);

    function taskRow(t) {
      const overdue = !t.props.done && t.props.due && t.props.due < today;
      return el('div', { class: 'obj-row task-row' },
        el('input', {
          type: 'checkbox', class: 'task-check', 'aria-label': `Done: ${t.title}`,
          checked: t.props.done ? true : undefined,
          onchange: async (e) => {
            await window.vault.objects.update(t.id, { props: { done: e.target.checked } });
            await draw();
          },
        }),
        el('button', {
          class: `obj-row-title truncate task-title ${t.props.done ? 'task-completed' : ''}`,
          onclick: () => navigate({ name: 'object', id: t.id }),
        }, t.title),
        t.props.project?.length
          ? el('span', { class: 'chip', style: `--chip:${typeOf('project')?.color}` }, 'project')
          : null,
        t.props.due
          ? el('span', { class: `small ${overdue ? 'danger-text' : 'muted'}` }, icon('calendar', 12), ' ', fmtDate(t.props.due))
          : null);
    }
  }

  return () => {};
}
