// Human-readable cell rendering for table/gallery views.
export function propDisplay(prop, value) {
  if (value === undefined || value === null || value === '') return '';
  switch (prop.kind) {
    case 'checkbox': return value ? '✓' : '';
    case 'daterange': return [value.start, value.end].filter(Boolean).join(' → ');
    case 'datetime': return String(value).replace('T', ' ');
    case 'multiselect':
    case 'tags': return (value || []).join(', ');
    case 'relation': return Array.isArray(value) ? `${value.length} linked` : '1 linked';
    case 'cover': return value?.name || (value ? 'Image' : '');
    case 'blocks': return String(value).split('\n')[0].slice(0, 60);
    default: return String(value);
  }
}
