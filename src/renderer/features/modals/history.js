// Version history modal: browse snapshots, preview, restore.
import { el, modal, toast, fmtDateTime } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';

export async function openHistory(objectId, onRestored) {
  const versions = await window.vault.versions.list(objectId);
  const preview = el('pre', { class: 'history-preview muted' }, 'Select a version to preview it.');
  let selected = null;

  const list = el('div', { class: 'history-list' },
    versions.length
      ? versions.map((v) => el('button', {
        class: 'history-row',
        onclick: async (e) => {
          list.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
          e.currentTarget.classList.add('on');
          selected = v.ts;
          const full = await window.vault.versions.get(objectId, v.ts);
          preview.textContent = `# ${full.title}\n\n${full.content || '(empty)'}`;
        },
      }, icon('history', 14), el('span', {}, fmtDateTime(v.ts)), el('span', { class: 'muted truncate' }, v.title)))
      : el('p', { class: 'muted' }, 'No versions yet — they are captured automatically as you edit.'));

  const body = el('div', { class: 'modal-body history-body' },
    list, preview,
    el('div', { class: 'modal-actions' },
      el('button', { class: 'btn btn-primary', onclick: async () => {
        if (!selected) { toast('Pick a version first', 'warn'); return; }
        await window.vault.versions.restore(objectId, selected);
        m.close();
        toast('Version restored');
        onRestored?.();
      } }, 'Restore selected')),
  );
  const m = modal({ title: 'Version history', body, wide: true });
}
