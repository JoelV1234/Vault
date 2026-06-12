const os = require('os');
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// 1. Setup isolated directories
const vaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-screenshots-'));
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-screenshots-data-'));

process.env.VAULT_SMOKE = '1';
process.env.VAULT_DIR = vaultDir;

const { app } = require('electron');
app.setPath('userData', userDataDir);

// 2. Write seed data BEFORE store initialization
fs.mkdirSync(path.join(vaultDir, 'objects'), { recursive: true });

// Seed collections.json
const collections = [
  {
    "id": "col-reading-list",
    "name": "Reading List",
    "typeId": "book",
    "pinnedToVault": true,
    "pinnedToType": true,
    "created": "2026-06-11T20:00:00.000Z"
  },
  {
    "id": "col-software-projects",
    "name": "Software Projects",
    "typeId": "project",
    "pinnedToVault": true,
    "pinnedToType": true,
    "created": "2026-06-11T20:01:00.000Z"
  }
];
fs.writeFileSync(path.join(vaultDir, 'collections.json'), JSON.stringify(collections, null, 2));

// Seed tags.json (colors)
const tagsColors = {
  "productivity": "#8153fc",
  "pkm": "#10b981",
  "software": "#3b82f6",
  "design": "#ec4899",
  "contact": "#f59e0b",
  "deepmind": "#14b8a6",
  "career": "#ef4444",
  "reading": "#a78bfa",
  "engineering": "#fb923c",
  "author": "#d97706"
};
fs.writeFileSync(path.join(vaultDir, 'tags.json'), JSON.stringify(tagsColors, null, 2));

// Seed objects (*.md)
const notes = [
  {
    id: "note-pkm",
    type: "note",
    title: "Personal Knowledge Management",
    pinned: true,
    tags: ["productivity", "pkm"],
    description: "Core principles of my personal knowledge base",
    content: `# Personal Knowledge Management

Welcome to my personal vault. I use this space to capture ideas, manage projects, and organize my library.

## Core Principles
- **Local-first**: I own my data as plain markdown files.
- **Object-based**: Everything is structured (notes, people, books, projects).
- **Bi-directional linking**: Using standard markdown links to connect ideas.

## Active Projects
- Developing my personal workspace in [Lumora PKM Studio](vault://lumora-pkm).
- Reviewing Steve Dalton's [The 2-Hour Job Search](vault://two-hour-job-search) to optimize networking.`
  },
  {
    id: "lumora-pkm",
    type: "project",
    title: "Lumora PKM Studio",
    pinned: true,
    tags: ["software", "design"],
    description: "A calm, fast, local-first PKM Studio app.",
    collections: ["col-software-projects"],
    props: {
      status: "Active",
      timeframe: {
        start: "2026-05-01",
        end: "2026-07-31"
      },
      people: ["jane-doe"]
    },
    content: `# Lumora PKM Studio

A beautiful, calm, and local-first personal knowledge management studio featuring:
- Structured object types
- Bi-directional links and backlinks
- Dynamic collections with list, table, gallery, and kanban views
- Force-directed 2D graph of connections

## Action Items
- [x] Design force-directed graph rendering
- [ ] Implement multi-select properties in table view
- [ ] Refine keyboard shortcut support`
  },
  {
    id: "jane-doe",
    type: "person",
    title: "Jane Doe",
    pinned: false,
    tags: ["contact", "deepmind"],
    description: "Senior Software Engineer at Google DeepMind",
    props: {
      email: "jane@example.com",
      company: "Google DeepMind",
      birthday: "1995-04-12"
    },
    content: `# Jane Doe

Senior Software Engineer at Google DeepMind working on Advanced Agentic Coding. Collaborating on [Lumora PKM Studio](vault://lumora-pkm).`
  },
  {
    id: "two-hour-job-search",
    type: "book",
    title: "The 2-Hour Job Search",
    pinned: false,
    tags: ["career", "reading"],
    description: "A systematic process for job hunting",
    collections: ["col-reading-list"],
    props: {
      author: "Steve Dalton",
      status: "Finished",
      rating: 5
    },
    content: `# The 2-Hour Job Search

A systematic process for job hunting using a data-driven approach: the LAMP list (List, Alumnus, Motivation, Posting).`
  },
  {
    id: "ddia",
    type: "book",
    title: "Designing Data-Intensive Applications",
    pinned: false,
    tags: ["engineering", "reading"],
    description: "The bible for system design",
    collections: ["col-reading-list"],
    props: {
      author: "Martin Kleppmann",
      status: "Reading",
      rating: 5
    },
    content: `# Designing Data-Intensive Applications

Key takeaways:
- **Reliability**: Systems should continue to work correctly even when things go wrong.
- **Scalability**: Strategies for handling growth.
- **Maintainability**: Making it easy for engineers to work on the system.`
  },
  {
    id: "steve-dalton",
    type: "person",
    title: "Steve Dalton",
    pinned: false,
    tags: ["author", "career"],
    description: "Author of The 2-Hour Job Search",
    props: {
      company: "Duke University",
      email: "steve@example.com"
    },
    content: `# Steve Dalton

Program director at Duke University's Fuqua School of Business and author of [The 2-Hour Job Search](vault://two-hour-job-search).`
  }
];

// Write daily note dynamically
const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
notes.push({
  id: "daily-note",
  type: "daily",
  title: todayStr,
  pinned: false,
  tags: ["productivity"],
  description: `Daily note for ${todayStr}`,
  props: {
    date: todayStr
  },
  content: `# ${todayStr}

Daily inbox:
- Capture ideas on the new [Lumora PKM Studio](vault://lumora-pkm) interface.
- Read Chapter 5 of [Designing Data-Intensive Applications](vault://ddia).
- Discuss job search tracking layout with [Steve Dalton](vault://steve-dalton).`
});

for (const n of notes) {
  const meta = {
    id: n.id,
    type: n.type,
    title: n.title,
    pinned: !!n.pinned,
    created: now.toISOString(),
    updated: now.toISOString(),
    props: n.props || {},
    tags: n.tags || [],
    description: n.description || '',
    collections: n.collections || []
  };
  const fileContent = matter.stringify(n.content, meta);
  fs.writeFileSync(path.join(vaultDir, 'objects', `${n.id}.md`), fileContent);
}

// 3. Import and boot main process
const main = require('./src/main/main.js');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  main.initStore();
  main.registerIpc();
  const win = main.createWindow({ hidden: true });

  await new Promise((r) => win.webContents.once('did-finish-load', r));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const js = (code) => win.webContents.executeJavaScript(`(async () => { ${code} })()`);

  // Ensure media/ directory exists
  const mediaDir = path.join(__dirname, '..', 'media');
  fs.mkdirSync(mediaDir, { recursive: true });

  console.log('App loaded. Capturing screenshots...');

  // --- View 1: Home Dashboard ---
  await sleep(3000); // Wait for loading + animations
  const imgHome = await win.webContents.capturePage();
  fs.writeFileSync(path.join(mediaDir, 'home.png'), imgHome.toPNG());
  console.log('Captured: home.png');

  // --- View 2: Note Editor ---
  await js(`
    // Click Note in sidebar
    const noteBtn = [...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Note');
    noteBtn?.click();
  `);
  await sleep(1000);
  await js(`
    // Click Personal Knowledge Management in the rows
    const row = [...document.querySelectorAll('.obj-row')].find(r => r.textContent.includes('Personal Knowledge Management'));
    row?.click();
  `);
  await sleep(2500); // Wait for editor to mount
  
  // Let's make sure the sidepanel is open to show backlinks
  await js(`
    const sidepanel = document.getElementById('sidepanel');
    if (sidepanel && sidepanel.hidden) {
      document.getElementById('panel-toggle')?.click();
    }
  `);
  await sleep(1000);

  const imgEditor = await win.webContents.capturePage();
  fs.writeFileSync(path.join(mediaDir, 'editor.png'), imgEditor.toPNG());
  console.log('Captured: editor.png');

  // --- View 3: Gallery Browse View ---
  await js(`
    // Click Book in the sidebar
    const bookBtn = [...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Book');
    bookBtn?.click();
  `);
  await sleep(1000);
  await js(`
    // Switch to gallery view
    const gallBtn = document.querySelector('[data-view="gallery"]');
    gallBtn?.click();
  `);
  await sleep(1500);
  const imgBrowse = await win.webContents.capturePage();
  fs.writeFileSync(path.join(mediaDir, 'browse.png'), imgBrowse.toPNG());
  console.log('Captured: browse.png');

  // --- View 4: Graph View ---
  await js(`
    // Click Graph in the sidebar
    const graphBtn = [...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Graph');
    graphBtn?.click();
  `);
  await sleep(3500); // Let the physics simulation run
  const imgGraph = await win.webContents.capturePage();
  fs.writeFileSync(path.join(mediaDir, 'graph.png'), imgGraph.toPNG());
  console.log('Captured: graph.png');

  console.log('All screenshots captured successfully!');
  
  // Cleanup
  try {
    fs.rmSync(vaultDir, { recursive: true, force: true });
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {
    console.error('Failed to cleanup temp directories:', e);
  }
  app.exit(0);
});
