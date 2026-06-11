// Assorted tag palette — each tag name hashes to a stable color,
// unless the user picked one explicitly (override map from the store).
const TAG_COLORS = [
  '#34d399', '#10b981', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc',
  '#f472b6', '#fb7185', '#f87171', '#fb923c', '#f59e0b', '#facc15',
  '#a3e635', '#4ade80', '#2dd4bf', '#22d3ee', '#38bdf8', '#e879f9',
];

const tagOverrides = new Map(); // lowercased tag -> user-chosen hex

export function setTagOverrides(map) {
  tagOverrides.clear();
  for (const [k, v] of Object.entries(map || {})) tagOverrides.set(k, v);
}

export function tagColor(name) {
  const lower = String(name).toLowerCase();
  const override = tagOverrides.get(lower);
  if (override) return override;
  let h = 0;
  for (const c of lower) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}
