// Turns STRATEGY_GUIDE.md into HTML for the in-app guide. It handles the subset of Markdown the
// guide uses, the same subset as tools/guide-to-html.mjs (which makes the PDF); keep them in step.

export interface GuideHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface GuideDoc {
  title: string;
  html: string;
  headings: GuideHeading[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = (s: string) => s.replace(/\*\*|\*|`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

/** A heading's anchor: "### Left of dealer" → "left-of-dealer". */
export const slug = (s: string) =>
  strip(s)
    .toLowerCase()
    .replace(/\((f\d+(?:, f\d+)*)\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inline = (s: string) =>
  esc(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\((F\d+(?:, F\d+)*)\)/g, '<span class="ref">$1</span>')
    .replace(/♥/g, '<span class="rs-red">♥</span>')
    .replace(/♦/g, '<span class="rs-red">♦</span>');

export function guideToHtml(source: string): GuideDoc {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const headings: GuideHeading[] = [];
  const used = new Set<string>();
  const anchor = (text: string) => {
    let id = slug(text) || 'section';
    for (let n = 2; used.has(id); n++) id = `${slug(text)}-${n}`;
    used.add(id);
    return id;
  };
  let html = '';
  let title = '';
  let open = false;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^# /.test(line)) { title = line.slice(2); i++; continue; }
    if (/^---\s*$/.test(line)) { i++; continue; }
    if (/^## /.test(line)) {
      const text = line.slice(3);
      const id = anchor(text);
      headings.push({ id, text: strip(text), level: 2 });
      if (open) html += '</section>';
      open = true;
      html += `<section class="${/one-page card/i.test(text) ? 'guide-card' : ''}"><h2 id="${id}">${inline(text)}</h2>`;
      i++; continue;
    }
    if (/^### /.test(line)) {
      const text = line.slice(4);
      const id = anchor(text);
      headings.push({ id, text: strip(text), level: 3 });
      html += `<h3 id="${id}">${inline(text)}</h3>`;
      i++; continue;
    }
    if (/^\|/.test(line)) {
      const rows: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i]!)) rows.push(lines[i++]!);
      const cells = (r: string) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]!);
      const right = cells(rows[1]!).map((c) => c.endsWith(':'));
      const td = (tag: string, c: string, k: number) => `<${tag}${right[k] ? ' class="num"' : ''}>${inline(c)}</${tag}>`;
      html += '<div class="guide-table"><table><thead><tr>' + head.map((h, k) => td('th', h, k)).join('') + '</tr></thead><tbody>';
      for (const r of rows.slice(2)) html += '<tr>' + cells(r).map((c, k) => td('td', c, k)).join('') + '</tr>';
      html += '</tbody></table></div>';
      continue;
    }
    if (/^\s*- /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: { text: string; sub: string[] }[] = [];
      while (i < lines.length && (/^\s*- /.test(lines[i]!) || /^\d+\. /.test(lines[i]!))) {
        const l = lines[i]!;
        const text = l.replace(/^\s*(- |\d+\. )/, '');
        if (/^\s{2,}- /.test(l) && items.length) items[items.length - 1]!.sub.push(text);
        else items.push({ text, sub: [] });
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      html += `<${tag}>` + items.map((it) => `<li>${inline(it.text)}${it.sub.length ? '<ul>' + it.sub.map((s) => `<li>${inline(s)}</li>`).join('') + '</ul>' : ''}</li>`).join('') + `</${tag}>`;
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '' && !/^(#|\||\s*- |\d+\. |---)/.test(lines[i]!)) para.push(lines[i++]!);
    html += `<p>${inline(para.join(' '))}</p>`;
  }
  if (open) html += '</section>';
  // Explanation notes, boxed as in the PDF.
  html = html
    .replace(/<li><strong>(Why\b[^<]*:)<\/strong>/g, '<li class="why"><strong>$1</strong>')
    .replace(/<li><strong>(Likely why \(untested\)[^<]*:)<\/strong>/g, '<li class="likely"><strong>$1</strong>');
  return { title, html, headings };
}
