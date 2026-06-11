// Text statistics for the current object (words, characters, reading time).
import { el, modal } from '../../shared/ui.js';
import { getActiveEditor } from './active-editor.js';

export function openTextStats(obj) {
  const md = getActiveEditor()?.getMarkdown() ?? obj.content ?? '';
  const plain = md.replace(/[#>*_`~\-[\]()]/g, ' ');
  const words = (plain.match(/\S+/g) || []).length;
  const chars = md.length;
  const charsNoSpace = md.replace(/\s/g, '').length;
  const lines = md.split('\n').filter((l) => l.trim()).length;
  const headings = (md.match(/^#{1,6}\s/gm) || []).length;
  const readMins = Math.max(1, Math.round(words / 220));

  const row = (label, value) => el('div', { class: 'info-row' },
    el('span', { class: 'muted' }, label), el('span', {}, String(value)));

  modal({
    title: 'Text stats',
    body: el('div', { class: 'modal-body' },
      row('Words', words),
      row('Characters', chars),
      row('Characters (no spaces)', charsNoSpace),
      row('Non-empty lines', lines),
      row('Headings', headings),
      row('Reading time', `~${readMins} min`)),
  });
}
