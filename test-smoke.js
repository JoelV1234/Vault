// End-to-end smoke test: real main-process wiring, hidden offscreen window,
// DOM-driven probes of every major view. Run with:
//   VAULT_SMOKE=1 electron test-smoke.js --no-sandbox
process.env.VAULT_SMOKE = '1';
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.VAULT_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-smoke-'));

const { app } = require('electron');
// keep test settings out of the real userData (theme flips etc.)
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'vault-smoke-data-')));
const main = require('./src/main/main.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
};

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  main.initStore();
  main.registerIpc();
  const win = main.createWindow({ hidden: true });

  const rendererErrors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 3) rendererErrors.push(message);
    if (level >= 2) console.log(`[renderer] ${message}`);
  });

  await new Promise((r) => win.webContents.once('did-finish-load', r));
  await sleep(2500);

  const js = (code) => win.webContents.executeJavaScript(`(async () => { ${code} })()`);

  // 1. shell renders
  const shell = await js(`return {
    sideItems: document.querySelectorAll('.side-item').length,
    wordmark: !!document.querySelector('.wordmark'),
    greeting: document.querySelector('.home-greeting')?.textContent || '',
    captureInput: !!document.querySelector('.capture-input'),
  };`);
  check('sidebar renders with nav + types', shell.sideItems > 10);
  check('wordmark present', shell.wordmark);
  check('home view with greeting + capture', /Good|Up late/.test(shell.greeting) && shell.captureInput);

  // 2. browse a type, create an object through the real UI path
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Note')?.click();`);
  await sleep(900);
  const browse = await js(`return {
    toolbar: !!document.querySelector('.browse-toolbar'),
    viewBtns: document.querySelectorAll('.view-btn').length,
  };`);
  check('browse view with 3 view switchers', browse.toolbar && browse.viewBtns === 3);

  await js(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'New Note')?.click();`);
  await sleep(2200);
  const objView = await js(`return {
    title: document.querySelector('.object-title')?.value || '',
    editor: !!document.querySelector('.editor-host .milkdown'),
    panelTabs: document.querySelectorAll('.panel-tab').length,
    typePill: document.querySelector('.type-pill')?.textContent.trim() || '',
    collectionsBtn: !!document.querySelector('.collections-btn'),
    tagsRow: !!document.querySelector('.tags-row'),
    backBtn: !!document.querySelector('.back-btn'),
  };`);
  check('object created & editor (Crepe) mounted', objView.title === 'New Note' && objView.editor);
  check('side panel with 3 tabs', objView.panelTabs === 3);
  check('header: type pill + collections + tags + back', objView.typePill === 'Note' && objView.collectionsBtn && objView.tagsRow && objView.backBtn);

  // collections popover: create a collection inline, object joins it
  await js(`document.querySelector('.collections-btn')?.click();`);
  await sleep(400);
  await js(`
    const inp = document.querySelector('.col-new input');
    inp.value = 'My Collection';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  `);
  await sleep(800);
  const colState = await js(`return {
    chips: [...document.querySelectorAll('.collection-chip:not(.collection-add)')].map(c => c.textContent.trim()),
    sidebarHasCollection: [...document.querySelectorAll('.side-sub')].some(b => b.textContent.includes('My Collection')),
  };`);
  check('object joined new collection + sidebar shows it',
    colState.chips.length === 1 && colState.chips[0] === 'My Collection' && colState.sidebarHasCollection);

  // multi-membership: join a SECOND collection from the same popover
  await js(`
    const inp = document.querySelector('.col-new input');
    inp.value = 'Second Collection';
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  `);
  await sleep(800);
  const multi = await js(`return {
    chips: [...document.querySelectorAll('.collection-chip:not(.collection-add)')].map(c => c.textContent.trim()),
    checkedBoxes: [...document.querySelectorAll('.collections-pop input[type=checkbox]')].filter(c => c.checked).length,
  };`);
  check('object shows one chip per collection (two at once)',
    multi.chips.length === 2 && multi.chips.includes('My Collection') && multi.chips.includes('Second Collection') && multi.checkedBoxes === 2);
  await js(`document.querySelector('.menu')?.remove();`);

  // chip click navigates to that collection's browse view
  await js(`[...document.querySelectorAll('.collection-chip')].find(c => c.textContent.trim() === 'My Collection')?.click();`);
  await sleep(900);
  const chipNav = await js(`return document.querySelector('.browse-title h1')?.textContent || '';`);
  check('collection chip navigates to collection', chipNav === 'My Collection');
  await js(`[...document.querySelectorAll('.obj-row')].find(r => r.textContent.includes('New Note'))?.click();`);
  await sleep(1800);

  // ...and appears when browsing EACH collection
  await js(`[...document.querySelectorAll('.side-sub')].find(b => b.textContent.includes('My Collection'))?.click();`);
  await sleep(900);
  const inFirst = await js(`return [...document.querySelectorAll('.obj-row-title')].some(x => x.textContent === 'New Note');`);
  await js(`[...document.querySelectorAll('.side-sub')].find(b => b.textContent.includes('Second Collection'))?.click();`);
  await sleep(900);
  const inSecond = await js(`return [...document.querySelectorAll('.obj-row-title')].some(x => x.textContent === 'New Note');`);
  check('object listed in both collections', inFirst && inSecond);

  // back to the object for the type-switch test
  await js(`[...document.querySelectorAll('.obj-row')].find(r => r.textContent.includes('New Note'))?.click();`);
  await sleep(1800);

  // remove one membership via the chip's hover X badge
  const beforeRemove = await js(`return {
    chips: document.querySelectorAll('.collection-chip:not(.collection-add)').length,
    removeBtns: document.querySelectorAll('.collection-chip-remove').length,
    hidden: getComputedStyle(document.querySelector('.collection-chip-remove')).opacity === '0',
  };`);
  check('each membership chip has a hidden remove X', beforeRemove.chips === 2 && beforeRemove.removeBtns === 2 && beforeRemove.hidden);
  await js(`document.querySelector('.collection-chip-remove')?.click();`);
  await sleep(700);
  const afterRemove = await js(`return {
    chips: document.querySelectorAll('.collection-chip:not(.collection-add)').length,
    persisted: (await window.vault.objects.list({})).find(o => o.title === 'New Note').collections.length,
  };`);
  check('X removes the membership (chip + persisted)', afterRemove.chips === 1 && afterRemove.persisted === 1);

  // type switcher pill
  await js(`document.querySelector('.menu')?.remove(); document.querySelector('.type-pill')?.click();`);
  await sleep(400);
  await js(`[...document.querySelectorAll('.menu-item')].find(b => b.textContent.trim() === 'Idea')?.click();`);
  await sleep(1500);
  const switched = await js(`return {
    pill: document.querySelector('.type-pill')?.textContent.trim() || '',
    chips: document.querySelectorAll('.collection-chip:not(.collection-add)').length,
    emptyBtn: !!document.querySelector('.collections-btn'),
  };`);
  check('type switched via pill', switched.pill === 'Idea');
  check('membership pruned after type change', switched.chips === 0 && switched.emptyBtn);

  const filesOnDisk = fs.readdirSync(path.join(process.env.VAULT_DIR, 'objects')).filter((f) => f.endsWith('.md'));
  check('object persisted as markdown on disk', filesOnDisk.length === 1);

  // tags: meta chip, inline #tag decoration, tag page + scoped search, overview
  await js(`
    const ti = document.querySelector('.tags-row .chip-input');
    ti.value = 'alpha';
    ti.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  `);
  await sleep(500);
  const metaTag = await js(`return {
    chip: document.querySelector('.tags-row .tag-chip .tag-label')?.textContent || '',
    colored: (document.querySelector('.tags-row .tag-chip')?.getAttribute('style') || '').includes('--chip:'),
    painted: getComputedStyle(document.querySelector('.tags-row .tag-chip')).backgroundColor !== 'rgba(0, 0, 0, 0)',
  };`);
  check('meta tag renders as colored #chip', metaTag.chip === '#alpha' && metaTag.colored);
  check('tag tint actually paints (color-mix support)', metaTag.painted);

  await js(`
    const o = (await window.vault.objects.list({})).find(x => x.title === 'New Note');
    await window.vault.objects.update(o.id, { content: 'hello #beta world' });
  `);
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Idea')?.click();`);
  await sleep(900);
  await js(`[...document.querySelectorAll('.obj-row')].find(r => r.textContent.includes('New Note'))?.click();`);
  await sleep(2200);
  const inline = await js(`return {
    text: document.querySelector('.milkdown .inline-tag')?.textContent || '',
    colored: (document.querySelector('.milkdown .inline-tag')?.getAttribute('style') || '').includes('--chip:'),
  };`);
  check('inline #tag decorated in editor', inline.text === '#beta' && inline.colored);

  await js(`document.querySelector('.milkdown .inline-tag')?.click();`);
  await sleep(900);
  const tagPage = await js(`return {
    pill: document.querySelector('.tag-chip-lg')?.textContent || '',
    listed: [...document.querySelectorAll('.obj-row-title')].some(x => x.textContent === 'New Note'),
    search: !!document.querySelector('.search-big'),
  };`);
  check('inline tag click opens tag page with object + scoped search', tagPage.pill === '#beta' && tagPage.listed && tagPage.search);

  await js(`
    const inp = document.querySelector('.search-big');
    inp.value = 'zzz-no-match';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  await sleep(500);
  const scoped = await js(`return document.querySelectorAll('.obj-row').length;`);
  check('tag page search narrows results', scoped === 0);

  // change the tag's color from its page, then reset
  await js(`document.querySelector('.tag-color-row .color-swatch')?.click();`);
  await sleep(1800);
  const colored = await js(`return {
    pillStyle: document.querySelector('.tag-chip-lg')?.getAttribute('style') || '',
    saved: (await window.vault.tags.colors()).beta || null,
  };`);
  check('tag color changed + persisted', !!colored.saved && colored.pillStyle.includes(colored.saved));
  await js(`[...document.querySelectorAll('.tag-color-row button')].find(b => b.textContent.trim() === 'Auto')?.click();`);
  await sleep(700);
  const resetColor = await js(`return (await window.vault.tags.colors()).beta || null;`);
  check('tag color reset to automatic', resetColor === null);

  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Tags')?.click();`);
  await sleep(900);
  const overview = await js(`return [...document.querySelectorAll('.tag-tile')].map(t => t.textContent.trim());`);
  check('tags overview lists alpha + beta with counts',
    overview.some((t) => t.includes('alpha') && t.includes('(1)')) && overview.some((t) => t.includes('beta')));

  // 3. daily note
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Daily notes')?.click();`);
  await sleep(2200);
  const daily = await js(`return { nav: !!document.querySelector('.daily-nav'), editor: !!document.querySelector('.milkdown') };`);
  check('daily note auto-created with date nav', daily.nav && daily.editor);

  // 4. graph
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Graph')?.click();`);
  await sleep(1200);
  const graph = await js(`return { canvas: !!document.querySelector('.graph-canvas'), toolbar: !!document.querySelector('.graph-toolbar') };`);
  check('graph view with canvas + toolbar', graph.canvas && graph.toolbar);

  // 5. tasks + search
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Tasks')?.click();`);
  await sleep(900);
  check('tasks view', await js(`return !!document.querySelector('.tasks-page')`));
  await js(`[...document.querySelectorAll('.side-item')].find(b => b.textContent.trim() === 'Search')?.click();`);
  await sleep(900);
  check('search view', await js(`return !!document.querySelector('.search-page')`));

  // 6. command palette via Ctrl+K
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));`);
  await sleep(700);
  const palette = await js(`return {
    open: !!document.querySelector('.palette'),
    rows: document.querySelectorAll('.palette-row').length,
  };`);
  check('command palette opens with rows', palette.open && palette.rows > 3);
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));`);

  // 7. theme switch
  await js(`window.vault.settings.set({ theme: 'light' });`);
  await sleep(400);
  // applyTheme runs through the settings modal normally; verify IPC round-trip at least
  const settings = await js(`return await window.vault.settings.get();`);
  check('settings persist via IPC', settings.theme === 'light');

  check('no renderer errors', rendererErrors.length === 0);
  if (rendererErrors.length) console.log('Renderer errors:', rendererErrors.slice(0, 5));

  console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} FAILURES`);
  fs.rmSync(process.env.VAULT_DIR, { recursive: true, force: true });
  app.exit(failures === 0 ? 0 : 1);
});

setTimeout(() => { console.log('TIMEOUT'); app.exit(2); }, 60000);
