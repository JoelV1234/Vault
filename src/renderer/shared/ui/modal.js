// Modal dialog + confirm prompt built on top of it.
import { el, overlays } from './dom.js';
import { icon } from '../icons.js';

export function modal({ title, body, wide = false, onClose }) {
  const backdrop = el('div', { class: 'backdrop', role: 'presentation' });
  const card = el('div', {
    class: `modal ${wide ? 'modal-wide' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
  });
  const close = () => {
    backdrop.classList.add('closing');
    setTimeout(() => backdrop.remove(), 160);
    document.removeEventListener('keydown', onKey, true);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  card.append(
    el('div', { class: 'modal-head' },
      el('h2', {}, title),
      el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('x', 18))),
    body
  );
  backdrop.append(card);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  overlays().append(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return { close, card };
}

export function confirmDialog(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const body = el('div', { class: 'modal-body' },
      el('p', { class: 'muted' }, message),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'btn', onclick: () => { m.close(); resolve(false); } }, 'Cancel'),
        el('button', { class: 'btn btn-danger', onclick: () => { m.close(); resolve(true); } }, confirmLabel)));
    const m = modal({ title: 'Are you sure?', body, onClose: () => resolve(false) });
  });
}
