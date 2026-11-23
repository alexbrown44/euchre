// Converts STRATEGY_GUIDE.md (the subset of Markdown it uses) into a print-styled HTML page.
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const md = readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links: keep the text only (relative links don't work in a PDF)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\((F\d+(?:, F\d+)*)\)/g, '<span class="ref">$1</span>')
    .replace(/✔/g, '<span class="yes">✔</span>')
    .replace(/✘/g, '<span class="no">✘</span>');

const lines = md.split('\n');
let html = '';
let i = 0;
let h2count = 0;
let title = '';
let subtitle = '';

while (i < lines.length) {
  const line = lines[i];
  if (/^# /.test(line)) { title = line.slice(2); i++; continue; }
  if (/^\*For the/.test(line) && !subtitle) { subtitle = inline(line); i++; continue; }
  if (/^---\s*$/.test(line)) { i++; continue; }
  if (/^## /.test(line)) {
    h2count++;
    const text = line.slice(3);
    const cls = [];
    if (/^(1|2|5|8|9)\. /.test(text)) cls.push('newpage');
    if (/one-page card/i.test(text)) cls.push('card-title');
    if (h2count > 1) html += '</section>';
    html += `<section class="${/one-page card/i.test(text) ? 'card' : ''}"><h2 class="${cls.join(' ')}">${inline(text)}</h2>`;
    i++; continue;
  }
  if (/^### /.test(line)) { html += `<h3>${inline(line.slice(4))}</h3>`; i++; continue; }
  if (/^\|/.test(line)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
    const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    const aligns = cells(rows[1]).map((c) => (c.endsWith(':') ? 'right' : 'left'));
    let t = '<table><thead><tr>' + head.map((h, k) => `<th style="text-align:${aligns[k]}">${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
    for (const r of rows.slice(2)) {
      t += '<tr>' + cells(r).map((c, k) => `<td style="text-align:${aligns[k]}">${inline(c)}</td>`).join('') + '</tr>';
    }
    html += t + '</tbody></table>';
    continue;
  }
  if (/^\s*- /.test(line) || /^\d+\. /.test(line)) {
    // list, possibly with one level of nesting
    const ordered = /^\d+\. /.test(line);
    let items = [];
    while (i < lines.length && (/^\s*- /.test(lines[i]) || /^\d+\. /.test(lines[i]))) {
      const l = lines[i];
      const nested = /^\s{2,}- /.test(l);
      const text = l.replace(/^\s*(- |\d+\. )/, '');
      if (nested && items.length) items[items.length - 1].sub.push(text);
      else items.push({ text, sub: [] });
      i++;
    }
    const tag = ordered ? 'ol' : 'ul';
    html += `<${tag}>` + items.map((it) => `<li>${inline(it.text)}${it.sub.length ? '<ul>' + it.sub.map((s) => `<li>${inline(s)}</li>`).join('') + '</ul>' : ''}</li>`).join('') + `</${tag}>`;
    continue;
  }
  if (line.trim() === '') { i++; continue; }
  // paragraph
  const para = [];
  while (i < lines.length && lines[i].trim() !== '' && !/^(#|\||\s*- |\d+\. |---)/.test(lines[i])) { para.push(lines[i]); i++; }
  html += `<p>${inline(para.join(' '))}</p>`;
}
html += '</section>';

// Explanation notes: "Why:" (measured, or follows from the rules) and "Likely why (untested):" (reasoning).
html = html
  .replace(/<li><strong>Why:<\/strong>/g, '<li class="why"><strong>Why:</strong>')
  .replace(/<li><strong>Likely why \(untested\):<\/strong>/g, '<li class="likely"><strong>Likely why (untested):</strong>');

const page = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm 16mm 15mm; }
  :root { --ink:#1d2a26; --muted:#5b6b66; --green:#0f5c4a; --green-soft:#e6f1ed; --gold:#b8862b; --gold-soft:#fbf4e4; --line:#d5ddd9; --red:#a33a2c; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: var(--ink); font-size: 9.6pt; line-height: 1.45; margin: 0; background: #fff; }
  .cover { background: var(--green); color: #fff; padding: 22mm 14mm 16mm; border-radius: 3mm; margin-bottom: 7mm; position: relative; overflow: hidden; }
  .cover .suits { position: absolute; right: 10mm; top: 8mm; font-size: 46pt; letter-spacing: 3mm; opacity: .16; }
  .cover .kicker { text-transform: uppercase; letter-spacing: .18em; font-size: 8.5pt; color: #f3d48f; font-weight: 600; }
  .cover h1 { font-family: Georgia, "Times New Roman", serif; font-size: 30pt; margin: 2mm 0 3mm; font-weight: 700; }
  .cover p { margin: 0; color: #dcebe5; font-size: 10.5pt; }
  .cover p strong { color: #fff; }
  .intro { font-size: 10pt; }
  h2 { font-family: Georgia, "Times New Roman", serif; color: var(--green); font-size: 16pt; margin: 6mm 0 2.5mm; padding-bottom: 1.5mm; border-bottom: 1.5pt solid var(--gold); break-after: avoid; }
  h2.newpage { break-before: page; margin-top: 0; }
  h3 { font-size: 11pt; color: var(--green); margin: 4.5mm 0 1.5mm; break-after: avoid; }
  p { margin: 0 0 2.2mm; }
  ul, ol { margin: 0 0 2.5mm; padding-left: 5.5mm; }
  li { margin: 0 0 1mm; }
  li ul { margin-top: 1mm; }
  strong { color: #0c3d31; }
  table { width: 100%; border-collapse: collapse; margin: 1.5mm 0 3.5mm; font-size: 9pt; break-inside: avoid; }
  th { background: var(--green); color: #fff; font-weight: 600; padding: 1.6mm 2mm; border: 0.5pt solid var(--green); }
  th strong { color: #fff; }
  td { padding: 1.4mm 2mm; border: 0.5pt solid var(--line); vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f5f8f7; }
  .ref { color: var(--gold); font-size: 7.6pt; font-weight: 600; white-space: nowrap; }
  .yes { color: var(--green); font-weight: 700; }
  .no { color: var(--red); font-weight: 700; }
  code { font-family: Consolas, monospace; font-size: 8.5pt; }
  section.card { background: var(--gold-soft); border: 1pt solid #e6d3a5; border-radius: 3mm; padding: 1mm 5mm 3mm; break-before: page; }
  section.card h2 { margin-top: 3mm; }
  section.card h3 { background: var(--green-soft); color: var(--green); padding: 1mm 2.5mm; border-radius: 1.5mm; margin-top: 3.5mm; }
  section.card table { background: #fff; }
  section.card ul { margin-bottom: 1.5mm; }
  section.card li { margin-bottom: .6mm; }
  li.why, li.likely { list-style: none; margin: 1mm 0 1.4mm -4mm; padding: 1mm 2.5mm; border-left: 2pt solid; border-radius: 0 1.5mm 1.5mm 0; font-size: 9pt; break-inside: avoid; }
  li.why { background: var(--green-soft); border-color: var(--green); }
  li.why strong:first-child { color: var(--green); }
  li.likely { background: var(--gold-soft); border-color: var(--gold); }
  li.likely strong:first-child { color: #8a6418; font-style: italic; }
  .footer-note { margin-top: 6mm; font-size: 8pt; color: var(--muted); border-top: .5pt solid var(--line); padding-top: 2mm; }
</style></head><body>
<div class="cover">
  <div class="suits">♠♥♦♣</div>
  <div class="kicker">Lizard Peninsula Euchre League</div>
  <h1>${esc(title)}</h1>
  <p>Advice for the table, tested on hundreds of thousands of simulated hands under league house rules.</p>
</div>
<div class="intro">${html}</div>
<p class="footer-note">Compiled ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. References such as <span class="ref">F7</span> point to the numbered findings in the full Strategy Findings document.</p>
</body></html>`;

writeFileSync(out, page);
console.log('wrote', out);
