// Daily notes: idempotent per-date creation and quick-capture appends.
const { todayStr } = require('./util');

function ensureDaily(store, dateStr = todayStr()) {
  for (const o of store.objects.values())
    if (o.meta.type === 'daily' && o.meta.props.date === dateStr) return store.get(o.meta.id);
  return store.create({ typeId: 'daily', title: dateStr, props: { date: dateStr }, content: '' });
}

function appendToDaily(store, text) {
  const daily = ensureDaily(store);
  const sep = daily.content.trim() ? '\n\n' : '';
  return store.update(daily.id, { content: daily.content + sep + text.trim() });
}

module.exports = { ensureDaily, appendToDaily };
