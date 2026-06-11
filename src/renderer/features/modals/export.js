// Export modal: Markdown / JSON / CSV / PDF.
import { el, modal, toast } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';

export function openExport() {
  const row = (format, iconName, label, desc) =>
    el('button', {
      class: 'export-row',
      onclick: async () => {
        const res = await window.vault.exportVault(format);
        if (res) toast(res.file ? `Saved ${res.file}` : `Exported ${res.count} objects → ${res.dir}`);
      },
    },
      icon(iconName, 20),
      el('div', {},
        el('div', { class: 'export-label' }, label),
        el('div', { class: 'muted small' }, desc)));

  const body = el('div', { class: 'modal-body' },
    row('markdown', 'file-text', 'Markdown', 'Every object as a portable .md file with frontmatter, plus assets'),
    row('json', 'braces', 'JSON', 'Complete dump: objects, types, and collections in one file'),
    row('csv', 'table', 'CSV', 'One spreadsheet per object type with all properties'),
    row('pdf', 'printer', 'PDF (current view)', 'Print the object you are viewing to a PDF file'),
    el('p', { class: 'muted small' }, 'Your data is always yours — the vault folder itself is already plain markdown.'),
  );
  modal({ title: 'Export', body });
}
