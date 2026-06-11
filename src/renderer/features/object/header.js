// Object page header: back button, type pill, collections, daily-note nav,
// title, tags row, and the action buttons (image, pin, history, delete).
import { el, debounce, toast, confirmDialog, todayStr, shiftDate, dropdown } from '../../shared/ui.js';
import { icon } from '../../shared/icons.js';
import { ctx, navigate, goBack, refreshSidebar } from '../../shared/state.js';
import { propEditor } from '../properties/props.js';
import { openHistory } from '../modals/modals.js';
import { openCollectionsPopover } from './collections-popover.js';
import { getActiveEditor } from './active-editor.js';

function gotoDaily(dateStr) {
  window.vault.daily.ensure(dateStr).then((d) => navigate({ name: 'daily', id: d.id, date: dateStr }));
}

export function buildHeader(obj, type, route) {
  const isDaily = obj.type === 'daily';

  const saveTitle = debounce(async (title) => {
    await window.vault.objects.update(obj.id, { title });
    refreshSidebar();
  }, 500);

  const titleInput = el('input', {
    class: 'object-title', value: obj.title, 'aria-label': 'Title',
    placeholder: 'Untitled',
    oninput: (e) => saveTitle(e.target.value || 'Untitled'),
  });

  const pinBtn = el('button', {
    class: `icon-btn ${obj.pinned ? 'accent' : ''}`, 'aria-label': obj.pinned ? 'Unpin' : 'Pin',
    onclick: async () => {
      obj.pinned = !obj.pinned;
      await window.vault.objects.update(obj.id, { pinned: obj.pinned });
      pinBtn.classList.toggle('accent', obj.pinned);
      refreshSidebar();
    },
  }, icon('pin', 16));

  const dailyNav = isDaily
    ? el('div', { class: 'daily-nav' },
      el('button', {
        class: 'icon-btn', 'aria-label': 'Previous day',
        onclick: () => gotoDaily(shiftDate(obj.props.date || todayStr(), -1)),
      }, icon('chevron-left', 17)),
      el('input', {
        type: 'date', class: 'prop-input daily-date', value: obj.props.date || todayStr(),
        onchange: (e) => e.target.value && gotoDaily(e.target.value),
      }),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Next day',
        onclick: () => gotoDaily(shiftDate(obj.props.date || todayStr(), 1)),
      }, icon('chevron-right', 17)),
      el('button', { class: 'btn btn-small', onclick: () => gotoDaily(todayStr()) }, 'Today'))
    : null;

  // ----- type pill: shows the type, click to change it -----
  const typePill = el('button', {
    class: 'type-pill', style: `--chip:${type?.color || '#888'}`,
    'aria-label': isDaily ? type?.name : 'Change object type',
    onclick: isDaily ? undefined : () => {
      dropdown(typePill, ctx.types.filter((t) => t.id !== 'daily').map((t) => ({
        label: t.name,
        icon: t.icon,
        onClick: async () => {
          await window.vault.objects.update(obj.id, { type: t.id });
          refreshSidebar();
          navigate({ ...route }, { push: false });
        },
      })));
    },
  },
    icon(type?.icon || 'file-text', 14),
    el('span', {}, type?.name || 'Object'),
    isDaily ? null : icon('chevron-down', 13, 'pill-chevron'));

  // ----- collections: one chip per membership, "+" to manage -----
  const colWrap = el('div', { class: 'collections-row' });
  const renderCollections = () => {
    const mine = ctx.collections.filter((c) => (obj.collections || []).includes(c.id));
    const chips = mine.map((c) => {
      const body = el('button', {
        class: 'collection-chip', 'aria-label': `Open collection ${c.name}`, title: c.name,
        onclick: () => navigate({ name: 'browse', typeId: obj.type, collectionId: c.id }),
      }, icon('archive', 13), el('span', { class: 'truncate' }, c.name));
      const remove = el('button', {
        class: 'collection-chip-remove', 'aria-label': `Remove from ${c.name}`, title: `Remove from ${c.name}`,
        onclick: async (e) => {
          e.stopPropagation();
          obj.collections = (obj.collections || []).filter((id) => id !== c.id);
          await window.vault.objects.update(obj.id, { collections: obj.collections });
          renderCollections();
        },
      }, icon('x', 11));
      return el('div', { class: 'collection-chip-wrap' }, body, remove);
    });

    const manage = el('button', {
      class: mine.length ? 'collection-chip collection-add' : 'collections-btn',
      'aria-label': 'Manage collections',
      onclick: () => openCollectionsPopover(manage, obj, renderCollections),
    }, ...(mine.length
      ? [icon('plus', 13)]
      : [icon('archive', 15), el('span', {}, 'Collections')]));

    colWrap.replaceChildren(...chips, manage);
  };
  renderCollections();

  // ----- tags row -----
  const tagsRow = el('div', { class: 'tags-row' },
    icon('tag', 15),
    el('span', { class: 'muted' }, 'Tags'),
    propEditor({ id: '_tags', name: 'Tags', kind: 'tags' }, obj.tags || [], (v) => {
      obj.tags = v;
      window.vault.objects.update(obj.id, { tags: v });
    }, ctx.types));

  return el('div', { class: 'object-head-col' },
    el('div', { class: 'object-head-row' },
      el('button', { class: 'back-btn', 'aria-label': 'Back', onclick: () => goBack() }, icon('chevron-left', 18)),
      typePill,
      isDaily ? null : colWrap,
      dailyNav,
      el('div', { class: 'flex-spacer' }),
      el('div', { class: 'object-actions' },
      el('button', {
        class: 'icon-btn', 'aria-label': 'Insert image', title: 'Insert image',
        onclick: async () => {
          const asset = await window.vault.importAsset();
          if (asset) getActiveEditor()?.insertImage(`file://${asset.abs}`, asset.name);
        },
      }, icon('image-plus', 16)),
      pinBtn,
      el('button', {
        class: 'icon-btn', 'aria-label': 'Version history', title: 'Version history',
        onclick: () => openHistory(obj.id, () => navigate({ ...route }, { push: false })),
      }, icon('history', 16)),
      el('button', {
        class: 'icon-btn', 'aria-label': 'Delete object', title: 'Delete',
        onclick: async () => {
          if (await confirmDialog(`Move "${obj.title}" to the vault trash?`)) {
            await window.vault.objects.delete(obj.id);
            refreshSidebar();
            toast('Moved to trash');
            navigate({ name: 'home' });
          }
        },
      }, icon('trash-2', 16)))),
    titleInput,
    tagsRow);
}
