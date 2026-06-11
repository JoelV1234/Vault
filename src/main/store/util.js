// Small helpers shared across the store modules.
const todayStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const toListItem = ({ meta }) => ({ ...meta });

function snippetAround(content, needle) {
  const i = content.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return '';
  const start = Math.max(0, i - 50);
  return (start > 0 ? '…' : '') + content.slice(start, i + needle.length + 70).replace(/\n+/g, ' ').trim() + '…';
}

module.exports = { todayStr, toListItem, snippetAround };
