// "New collection" prompt for a given object type.
import { el, modal, toast } from '../../shared/ui.js';
import { reloadCollections } from '../../shared/state.js';

export function openNewCollection(typeId, onCreated) {
  const input = el('input', { class: 'prop-input', placeholder: 'Collection name' });
  const create = async () => {
    if (!input.value.trim()) return;
    const col = await window.vault.collections.save({ name: input.value.trim(), typeId });
    m.close();
    await reloadCollections();
    toast(`Collection "${col.name}" created`);
    onCreated?.(col);
  };
  const body = el('div', { class: 'modal-body' },
    el('p', { class: 'muted small' }, 'Collections group objects of the same type. Add objects from their page.'),
    input,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', onclick: create }, 'Create')));
  input.addEventListener('keydown', (e) => e.key === 'Enter' && create());
  const m = modal({ title: 'New collection', body });
  input.focus();
}
