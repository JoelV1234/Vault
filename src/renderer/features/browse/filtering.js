// Filter predicate shared by the type browser and the search page.
export function testOp(op, val, ref) {
  const v = String(val ?? '').toLowerCase(), r = String(ref ?? '').toLowerCase();
  switch (op) {
    case 'includes': return v.includes(r);
    case 'not_includes': return !v.includes(r);
    case 'is': return v === r; case 'is_not': return v !== r;
    case 'starts_with': return v.startsWith(r); case 'ends_with': return v.endsWith(r);
    case 'is_empty': return !val || val === '' || (Array.isArray(val) && !val.length);
    case 'is_not_empty': return !(!val || val === '' || (Array.isArray(val) && !val.length));
    case 'equals': return Number(val) === Number(ref);
    case 'not_equals': return Number(val) !== Number(ref);
    case 'gt': return Number(val) > Number(ref); case 'lt': return Number(val) < Number(ref);
    case 'on': return String(val || '').startsWith(String(ref || ''));
    case 'before': return String(val || '') < String(ref || '');
    case 'after': return String(val || '') > String(ref || '');
    case 'is_checked': return !!val; case 'is_unchecked': return !val;
    default: return true;
  }
}

// Evaluates the filter rows (with and/or connectors) against one object.
export function matchesFilters(o, filters, fields, fieldValue) {
  if (!filters.length) return true;
  const match = (f) => {
    const field = fields.find((x) => x.id === f.field);
    return field ? testOp(f.op, fieldValue(o, field), f.value) : true;
  };
  let result = match(filters[0]);
  for (let i = 1; i < filters.length; i++) {
    const m = match(filters[i]);
    result = filters[i].connector === 'or' ? result || m : result && m;
  }
  return result;
}
