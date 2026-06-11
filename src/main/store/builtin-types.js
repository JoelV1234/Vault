// Built-in Object Types seeded into every vault (user-editable afterwards).
const BUILTIN_TYPES = [
  { id: 'note', name: 'Note', icon: 'file-text', color: '#818cf8', props: [] },
  { id: 'daily', name: 'Daily Note', icon: 'calendar-days', color: '#f59e0b', props: [{ id: 'date', name: 'Date', kind: 'date' }] },
  { id: 'person', name: 'Person', icon: 'user', color: '#f472b6', props: [
    { id: 'email', name: 'Email', kind: 'email' }, { id: 'company', name: 'Company', kind: 'text' }, { id: 'birthday', name: 'Birthday', kind: 'date' }] },
  { id: 'book', name: 'Book', icon: 'book-open', color: '#34d399', props: [
    { id: 'author', name: 'Author', kind: 'text' }, { id: 'status', name: 'Status', kind: 'select', options: ['To read', 'Reading', 'Finished'] },
    { id: 'rating', name: 'Rating', kind: 'number' }] },
  { id: 'project', name: 'Project', icon: 'rocket', color: '#22d3ee', props: [
    { id: 'status', name: 'Status', kind: 'select', options: ['Idea', 'Active', 'On hold', 'Done'] },
    { id: 'timeframe', name: 'Timeframe', kind: 'daterange' }, { id: 'people', name: 'People', kind: 'relation' }] },
  { id: 'meeting', name: 'Meeting', icon: 'users', color: '#a78bfa', props: [
    { id: 'date', name: 'Date', kind: 'date' }, { id: 'attendees', name: 'Attendees', kind: 'relation' }] },
  { id: 'task', name: 'Task', icon: 'check-square', color: '#4ade80', props: [
    { id: 'done', name: 'Done', kind: 'checkbox' }, { id: 'due', name: 'Due', kind: 'date' },
    { id: 'project', name: 'Project', kind: 'relation' }] },
  { id: 'event', name: 'Event', icon: 'calendar', color: '#fb923c', props: [
    { id: 'when', name: 'When', kind: 'daterange' }, { id: 'location', name: 'Location', kind: 'text' }] },
  { id: 'highlight', name: 'Highlight', icon: 'quote', color: '#fbbf24', props: [
    { id: 'source', name: 'Source', kind: 'url' }, { id: 'sourceTitle', name: 'Source title', kind: 'text' }] },
  { id: 'image', name: 'Image', icon: 'image', color: '#f87171', props: [{ id: 'source', name: 'Source', kind: 'text' }] },
  { id: 'link', name: 'Link', icon: 'globe', color: '#60a5fa', props: [
    { id: 'url', name: 'URL', kind: 'url' }, { id: 'clipped', name: 'Clipped', kind: 'date' }] },
  { id: 'idea', name: 'Idea', icon: 'lightbulb', color: '#facc15', props: [] },
].map((t) => ({ ...t, builtin: true }));

module.exports = { BUILTIN_TYPES };
