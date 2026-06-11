// Quick-capture window: Enter saves to today's Daily Note, Esc dismisses.
const t = document.getElementById('t');
t.focus();
t.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.vault.captureSubmit(t.value);
  } else if (e.key === 'Escape') {
    window.vault.captureCancel();
  }
});
