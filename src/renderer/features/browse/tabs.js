// Object / Collection sub-tabs. The active sub-tab persists across
// navigations, so it lives here at module level.
import { el } from '../../shared/ui.js';
import { navigate } from '../../shared/state.js';

let currentSubTab = 'object';
export const getSubTab = () => currentSubTab;
export const setSubTab = (tab) => { currentSubTab = tab; };

export function buildTabs(b) {
  const { type, collection } = b;
  return el('div', { class: 'browse-tabs-container' },
    el('div', { class: 'browse-sidebar-tabs' },
      el('button', {
        class: `browse-sidebar-tab ${currentSubTab === 'object' || collection ? 'active' : ''}`,
        onclick: () => {
          currentSubTab = 'object';
          b.refresh();
        }
      }, 'Object'),
      el('button', {
        class: `browse-sidebar-tab ${currentSubTab === 'collection' && !collection ? 'active' : ''}`,
        onclick: () => {
          currentSubTab = 'collection';
          if (collection) {
            navigate({ name: 'browse', typeId: type.id });
          } else {
            b.refresh();
          }
        }
      }, 'Collection')
    )
  );
}
