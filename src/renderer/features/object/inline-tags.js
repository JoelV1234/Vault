// Render "#tag" text as colored pills via view-only decorations — the
// markdown source stays plain text, so files remain portable.
import { $prose } from '@milkdown/kit/utils';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import { tagColor } from '../../shared/ui.js';

const INLINE_TAG_RE = /(^|[\s(>])#([\p{L}\p{N}_-]{1,40})/gu;

function tagDecorations(doc) {
  const decos = [];
  doc.descendants((node, pos) => {
    if (!node.isText || node.marks.some((m) => /code/i.test(m.type.name))) return;
    for (const m of node.text.matchAll(INLINE_TAG_RE)) {
      const start = pos + m.index + m[1].length;
      decos.push(Decoration.inline(start, start + m[2].length + 1, {
        class: 'inline-tag',
        'data-tag': m[2],
        style: `--chip:${tagColor(m[2])}`,
      }));
    }
  });
  return DecorationSet.create(doc, decos);
}

export const inlineTagPlugin = $prose(() => new Plugin({
  key: new PluginKey('vault-inline-tags'),
  props: {
    decorations: (state) => tagDecorations(state.doc),
  },
}));
