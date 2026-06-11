// Capacities-style templates: save an object as a reusable starting point,
// and apply a template to an object (content + unset properties + tags).
import { el, modal, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { typeOf } from '../../shared/state.js';
import { getActiveEditor } from '../object/active-editor.js';

const currentContent = (obj) => getActiveEditor()?.getMarkdown() ?? obj.content ?? '';

export function openSaveAsTemplate(obj) {
  const input = el('input', { class: 'prop-input', placeholder: 'Template name', value: obj.title });
  const save = async () => {
    if (!input.value.trim()) return;
    await window.vault.templates.save({
      typeId: obj.type,
      name: input.value.trim(),
      content: currentContent(obj),
      props: { ...obj.props },
      tags: [...(obj.tags || [])],
    });
    m.close();
    toast(`Template "${input.value.trim()}" saved`);
  };
  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted small' },
      `Saves this object's content, properties, and tags as a starting point for new ${typeOf(obj.type)?.name || ''} objects.`),
    input,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', onclick: save }, 'Save template')));
  input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  const m = modal({ title: 'Save as template', body });
  input.focus();
}

async function applyTemplate(obj, tpl) {
  const existing = currentContent(obj).trim();
  const content = existing ? `${existing}\n\n${tpl.content || ''}` : (tpl.content || '');
  // template props only fill slots the object hasn't set yet
  const props = { ...obj.props };
  for (const [k, v] of Object.entries(tpl.props || {}))
    if (props[k] === undefined || props[k] === null || props[k] === '') props[k] = v;
  const tags = [...new Set([...(obj.tags || []), ...(tpl.tags || [])])];
  await window.vault.objects.update(obj.id, { content, props, tags });
}

export async function openUseTemplate(obj, onApplied) {
  const templates = await window.vault.templates.list(obj.type);
  const list = el('div', { class: 'tpl-list' });
  const render = (tpls) => {
    list.replaceChildren(...(tpls.length
      ? tpls.map((t) => el('div', { class: 'tpl-row' },
        el('button', {
          class: 'tpl-apply', title: `Apply "${t.name}"`,
          onclick: async () => {
            await applyTemplate(obj, t);
            m.close();
            toast(`Template "${t.name}" applied`);
            onApplied?.();
          },
        }, icon('layout-template', 15), el('span', { class: 'truncate' }, t.name)),
        el('button', {
          class: 'icon-btn', 'aria-label': `Delete template ${t.name}`,
          onclick: async () => {
            await window.vault.templates.delete(t.id);
            render(await window.vault.templates.list(obj.type));
          },
        }, icon('trash-2', 14))))
      : [el('p', { class: 'muted small' },
        'No templates for this type yet — use "Save as Template" on an object to create one.')]));
  };
  render(templates);
  const body = el('div', { class: 'modal-body' }, list);
  const m = modal({ title: 'Use template', body });
}
