// "…" object menu (Capacities-style): templates, pin, change type, type
// settings, copy/export/import, text stats, duplicate, and delete.
import { dropdown, toast, confirmDialog } from '../../shared/ui.js';
import { navigate, refreshSidebar } from '../../shared/state.js';
import { openTypeEditor } from '../modals/modals.js';
import { openSaveAsTemplate, openUseTemplate } from '../templates/templates.js';
import { openTextStats } from './text-stats.js';
import { openChangeType } from './change-type.js';
import { getActiveEditor } from './active-editor.js';

const currentContent = (obj) => getActiveEditor()?.getMarkdown() ?? obj.content ?? '';
const refreshPage = (route) => navigate({ ...route }, { push: false });

export function openObjectMenu(anchor, obj, type, route) {
  dropdown(anchor, [
    { label: 'Use Template…', icon: 'layout-template', onClick: () => openUseTemplate(obj, () => refreshPage(route)) },
    { label: 'Save as Template', icon: 'save', onClick: () => openSaveAsTemplate(obj) },
    '-',
    { label: obj.pinned ? 'Unpin from Sidebar' : 'Pin to Sidebar', icon: 'pin', hint: 'Ctrl ⇧ P', onClick: async () => {
      obj.pinned = !obj.pinned;
      await window.vault.objects.update(obj.id, { pinned: obj.pinned });
      refreshSidebar();
      refreshPage(route);
    } },
    { label: 'Change Type…', icon: 'refresh-cw', onClick: () => openChangeType(obj, route) },
    { label: 'Object Type Settings…', icon: 'settings-2', onClick: () => type && openTypeEditor(type) },
    '-',
    { label: 'Copy Link', icon: 'link', onClick: async () => {
      await navigator.clipboard.writeText(`vault://${obj.id}`);
      toast('Link copied');
    } },
    { label: 'Copy as Markdown', icon: 'copy', onClick: async () => {
      await navigator.clipboard.writeText(`# ${obj.title}\n\n${currentContent(obj)}`);
      toast('Markdown copied');
    } },
    '-',
    { label: 'Export as PDF', icon: 'printer', hint: 'Ctrl E', onClick: async () => {
      const res = await window.vault.exportVault('pdf');
      if (res) toast(`Saved ${res.file}`);
    } },
    { label: 'Import Markdown…', icon: 'upload', hint: 'Ctrl I', onClick: async () => {
      const file = await window.vault.importTextFile();
      if (!file) return;
      const existing = currentContent(obj).trim();
      await window.vault.objects.update(obj.id, {
        content: existing ? `${existing}\n\n${file.text}` : file.text,
      });
      toast(`Imported ${file.name}`);
      refreshPage(route);
    } },
    '-',
    { label: 'Text Stats…', icon: 'bar-chart-3', onClick: () => openTextStats(obj) },
    { label: 'Duplicate', icon: 'copy-plus', onClick: async () => {
      const copy = await window.vault.objects.create({
        typeId: obj.type,
        title: `${obj.title} (copy)`,
        content: currentContent(obj),
        props: { ...obj.props },
        tags: [...(obj.tags || [])],
        description: obj.description || '',
        aliases: [...(obj.aliases || [])],
        icon: obj.icon || null,
        collections: [...(obj.collections || [])],
      });
      refreshSidebar();
      toast('Object duplicated');
      navigate({ name: 'object', id: copy.id });
    } },
    '-',
    { label: 'Delete Object', icon: 'trash-2', danger: true, hint: 'Ctrl ⌫', onClick: async () => {
      if (await confirmDialog(`Move "${obj.title}" to the vault trash?`)) {
        await window.vault.objects.delete(obj.id);
        refreshSidebar();
        toast('Moved to trash');
        navigate({ name: 'home' });
      }
    } },
  ]);
}
