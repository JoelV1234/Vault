// Settings modal: theme, accent, contrast, vault folder.
import { el, modal } from '../../shared/ui.js';
import { ctx, applyTheme, setSettings } from '../../shared/state.js';

export function openSettings() {
  const s = ctx.settings;
  const save = async (patch) => {
    setSettings(await window.vault.settings.set(patch));
    applyTheme(ctx.settings);
  };

  const themeRow = (label, control) =>
    el('div', { class: 'form-row' }, el('label', {}, label), control);

  const body = el('div', { class: 'modal-body' },
    themeRow('Theme', el('select', {
      class: 'prop-input', 'aria-label': 'Theme',
      onchange: (e) => save({ theme: e.target.value }),
    }, ...['dark', 'light'].map((t) => {
      const o = el('option', { value: t }, t === 'dark' ? 'Dark' : 'Light');
      if (s.theme === t) o.selected = true;
      return o;
    }))),
    themeRow('Accent', el('div', { class: 'chip-row' },
      ...['indigo', 'teal', 'emerald'].map((a) => el('button', {
        class: `accent-swatch accent-${a} ${s.accent === a ? 'on' : ''}`,
        'aria-label': `${a} accent`,
        onclick: (e) => {
          e.target.parentElement.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
          e.target.classList.add('on');
          save({ accent: a });
        },
      })))),
    themeRow('High contrast', el('input', {
      type: 'checkbox', checked: s.highContrast ? true : undefined,
      onchange: (e) => save({ highContrast: e.target.checked }),
    })),
    el('hr', { class: 'sep' }),
    el('div', { class: 'form-row' },
      el('label', {}, 'Vault folder'),
      el('div', { class: 'vault-path' },
        el('code', { class: 'truncate' }, s.resolvedVaultDir || ''),
        el('button', { class: 'btn btn-small', onclick: () => window.vault.openVaultFolder() }, 'Open'))),
    el('p', { class: 'muted small' },
      'Local-first: everything lives as plain markdown files in your vault folder. No telemetry, no tracking, no account.'),
  );
  modal({ title: 'Settings', body });
}
