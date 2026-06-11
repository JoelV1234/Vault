// Crepe (Milkdown) wrapper: change listener, @mention picker, vault:// link
// navigation, image insertion, and "turn selection into Object".
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { inlineTagPlugin } from './inline-tags.js';

export class VaultEditor {
  constructor({ root, content, types, onChange, onNavigate, onTagNavigate }) {
    this.root = root;
    this.content = content;
    this.types = types;
    this.onChange = onChange;
    this.onNavigate = onNavigate;
    this.onTagNavigate = onTagNavigate;
    this.crepe = null;
    this._destroyed = false;
  }

  async mount() {
    this.crepe = new Crepe({ root: this.root, defaultValue: this.content });
    this.crepe.editor.use(inlineTagPlugin);
    this.crepe.on((api) => {
      api.markdownUpdated((_ctx, markdown) => {
        if (!this._destroyed) this.onChange?.(markdown);
      });
    });
    await this.crepe.create();

    // Intercept link clicks: vault:// navigates in-app, http(s) opens externally.
    this.root.addEventListener('click', this.#onClick, true);
    // '@' triggers the mention picker.
    this.root.addEventListener('keydown', this.#onKeydown);
    return this;
  }

  #onClick = (e) => {
    const tagEl = e.target.closest?.('.inline-tag');
    if (tagEl) {
      e.preventDefault();
      e.stopPropagation();
      this.onTagNavigate?.(tagEl.dataset.tag);
      return;
    }
    const a = e.target.closest?.('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('vault://')) {
      e.preventDefault();
      e.stopPropagation();
      this.onNavigate?.(href.slice('vault://'.length));
    } else if (/^https?:\/\//.test(href)) {
      e.preventDefault();
      e.stopPropagation();
      window.vault.openExternal(href);
    }
  };

  #onKeydown = (e) => {
    if (e.key !== '@' || e.ctrlKey || e.metaKey) return;
    // Let the '@' land in the document first, then anchor a picker at the caret.
    setTimeout(() => this.#openMentionPicker(), 0);
  };

  #withView(fn) {
    return this.crepe.editor.action((ctx) => fn(ctx.get(editorViewCtx)));
  }

  #openMentionPicker() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    import('../../shared/ui.js').then(({ objectPicker }) => {
      objectPicker({
        types: this.types,
        anchorRect: rect,
        placeholder: 'Mention an object…',
        onPick: (obj) => this.#insertLink(obj.id, obj.title, { replaceAtSign: true }),
      });
    });
  }

  #insertLink(id, title, { replaceAtSign = false } = {}) {
    this.#withView((view) => {
      const { state } = view;
      const from = replaceAtSign ? state.selection.from - 1 : state.selection.from;
      const to = state.selection.to;
      const mark = state.schema.marks.link.create({ href: `vault://${id}` });
      const node = state.schema.text(title, [mark]);
      view.dispatch(state.tr.replaceWith(Math.max(0, from), to, node));
      view.focus();
    });
  }

  /** Open the link picker at the caret (Ctrl/Cmd+L). */
  openLinkPicker() {
    const sel = window.getSelection();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : this.root.getBoundingClientRect();
    import('../../shared/ui.js').then(({ objectPicker }) => {
      objectPicker({
        types: this.types,
        anchorRect: rect,
        onPick: (obj) => this.#insertLink(obj.id, obj.title),
      });
    });
  }

  /** Selected text, if any. */
  getSelectionText() {
    let text = '';
    this.#withView((view) => {
      const { from, to } = view.state.selection;
      text = view.state.doc.textBetween(from, to, '\n');
    });
    return text;
  }

  /** Replace the current selection with a link to an Object. */
  replaceSelectionWithLink(id, title) {
    this.#insertLink(id, title);
  }

  /** Insert an image node at the caret. */
  insertImage(src, alt = '') {
    this.#withView((view) => {
      const { state } = view;
      const node = state.schema.nodes.image.createAndFill({ src, alt });
      if (node) view.dispatch(state.tr.replaceSelectionWith(node));
      view.focus();
    });
  }

  getMarkdown() {
    return this.crepe ? this.crepe.getMarkdown() : this.content;
  }

  async destroy() {
    this._destroyed = true;
    this.root.removeEventListener('click', this.#onClick, true);
    this.root.removeEventListener('keydown', this.#onKeydown);
    try { await this.crepe?.destroy(); } catch { /* already torn down */ }
    this.crepe = null;
  }
}
