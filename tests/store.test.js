// Unit tests for the local-first vault store. Run: node tests/store.test.js
const os = require('os');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { VaultStore } = require('../src/main/store');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
const s = new VaultStore(dir);
s.init();

// types seeded
assert(s.listTypes().length >= 12, 'builtin types seeded');

// create + link
const alice = s.create({ typeId: 'person', title: 'Alice', props: { email: 'a@x.com' } });
const note = s.create({ typeId: 'note', title: 'Meeting prep', content: `Talk to [Alice](vault://${alice.id}) about Roadmap` });
const idea = s.create({ typeId: 'idea', title: 'Roadmap', content: 'big plans' });

// backlinks: linked + unlinked
assert.equal(s.backlinks(alice.id).linked.length, 1, 'one linked backlink');
assert.equal(s.backlinks(idea.id).unlinked.length, 1, 'unlinked mention found');

// graph
assert.equal(s.graph().nodes.length, 3);
assert.equal(s.graph().edges.length, 1);

// search
assert.equal(s.search('alice')[0].title, 'Alice');
assert(s.search('big plans')[0].snippet.includes('big plans'), 'content snippet');
assert.equal(s.search('alice', { typeId: 'note' }).length, 1, 'type-filtered content match');

// versions
s.update(note.id, { title: 'Meeting prep v2', content: 'changed' });
assert.equal(s.versions(note.id).length, 1, 'snapshot taken');
assert.equal(s.restoreVersion(note.id, s.versions(note.id)[0].ts).title, 'Meeting prep', 'restore works');

// relation props create backlinks
const proj = s.create({ typeId: 'project', title: 'Vault', props: { people: [alice.id] } });
assert(s.backlinks(alice.id).linked.some((x) => x.id === proj.id), 'relation backlink');

// daily + capture
assert.equal(s.ensureDaily('2026-06-10').id, s.ensureDaily('2026-06-10').id, 'daily idempotent');
s.appendToDaily('quick thought');
assert(s.ensureDaily().content.includes('quick thought'), 'quick capture appends');

// persistence round-trip
const s2 = new VaultStore(dir);
s2.init();
assert.equal(s2.get(alice.id).title, 'Alice', 'reload from disk');
assert(s2.backlinks(alice.id).linked.length >= 2, 'links rebuilt on load');
assert(fs.readFileSync(path.join(dir, 'objects', `${alice.id}.md`), 'utf8').startsWith('---'), 'yaml frontmatter');

// delete -> trash
s2.remove(idea.id);
assert(fs.existsSync(path.join(dir, 'trash', `${idea.id}.md`)), 'trashed, not destroyed');

// collections CRUD
const col = s2.saveCollection({ name: 'Open tasks', typeId: 'task', view: 'list', filters: [] });
assert.equal(s2.listCollections().length, 1);
s2.deleteCollection(col.id);
assert.equal(s2.listCollections().length, 0);

// membership collections: multi-membership, tags, type-change pruning
const colA = s2.saveCollection({ name: 'work', typeId: 'note' });
const colB = s2.saveCollection({ name: 'life', typeId: 'note' });
const multi = s2.create({ typeId: 'note', title: 'Multi', tags: ['focus'], collections: [colA.id, colB.id] });
assert.equal(s2.get(multi.id).collections.length, 2, 'object in multiple collections');
assert(s2.search('focus').some((r) => r.id === multi.id), 'tag search hit');
s2.update(multi.id, { type: 'idea' });
assert.equal(s2.get(multi.id).collections.length, 0, 'memberships pruned on type change');
s2.update(multi.id, { type: 'note', collections: [colA.id] });

// tags + memberships persist across reload
const s3 = new VaultStore(dir);
s3.init();
assert.equal(s3.get(multi.id).tags[0], 'focus', 'tags persist');
assert.deepEqual(s3.get(multi.id).collections, [colA.id], 'memberships persist');

// tags: meta + inline #tags, counts, per-tag lookup
const t1 = s3.create({ typeId: 'note', title: 'Tagged A', tags: ['Research'], content: 'also #deep inline' });
const t2 = s3.create({ typeId: 'note', title: 'Tagged B', content: 'mentions #research and #deep here' });
const allTags = s3.allTags();
const research = allTags.find((t) => t.name.toLowerCase() === 'research');
const deep = allTags.find((t) => t.name === 'deep');
assert(research && research.count === 2, 'meta + inline tags merge case-insensitively');
assert(deep && deep.count === 2, 'inline tags counted');
const byTag = s3.objectsByTag('research');
assert.equal(byTag.length, 2, 'objectsByTag finds meta and inline carriers');
assert(byTag.some((o) => o.id === t1.id) && byTag.some((o) => o.id === t2.id));
assert(!s3.objectsByTag('deep').some((o) => o.id === multi.id), 'untagged objects excluded');

// tag colors: override, surface in allTags, persist, reset
s3.setTagColor('Research', '#10b981');
assert.equal(s3.allTags().find((t) => t.name.toLowerCase() === 'research').color, '#10b981', 'color override in allTags');
const s4 = new VaultStore(dir);
s4.init();
assert.equal(s4.getTagColors().research, '#10b981', 'tag color persists in tags.json');
s4.setTagColor('Research', null);
assert.equal(s4.allTags().find((t) => t.name.toLowerCase() === 'research').color, null, 'color reset to automatic');

console.log('ALL STORE TESTS PASSED');
fs.rmSync(dir, { recursive: true });
