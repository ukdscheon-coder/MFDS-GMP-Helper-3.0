import { cellText, type Block, type Cell } from '../report';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

function td(c: Cell, w?: number) {
  const o = typeof c === 'string' ? { text: c } : c;
  const cls = [o.shade === 'head' ? 'hd' : o.shade === 'gap' ? 'gap' : '', o.align === 'center' ? 'c' : ''].join(' ');
  return `<td class="${cls}"${w ? ` style="width:${w}%"` : ''}>${o.bold ? '<b>' : ''}${esc(o.text)}${o.bold ? '</b>' : ''}</td>`;
}

export function toHtml(blocks: Block[], title: string): string {
  let body = '';
  for (const b of blocks) {
    if (b.t === 'title') body += `<h1>${esc(b.text)}</h1>${b.sub ? `<p class="sub">${esc(b.sub)}</p>` : ''}`;
    else if (b.t === 'h') body += `<h2>${esc(b.text)}</h2>`;
    else if (b.t === 'p') body += `<p class="${b.small ? 'sm' : ''}">${esc(b.text)}</p>`;
    else if (b.t === 'break') body += `<div class="pb"></div>`;
    else if (b.t === 'table') {
      body += '<table>';
      if (b.head) body += `<thead><tr>${b.head.map((h, i) => `<th style="width:${b.widths[i]}%">${esc(h)}</th>`).join('')}</tr></thead>`;
      body += `<tbody>${b.rows.map((r) => `<tr>${r.map((c, i) => td(c, b.head ? undefined : b.widths[i])).join('')}</tr>`).join('')}</tbody></table>`;
    } else if (b.t === 'sign') {
      body += `<p class="stmt">${esc(b.statement)}</p><p class="date">20&nbsp;&nbsp;&nbsp;&nbsp;년&nbsp;&nbsp;&nbsp;&nbsp;월&nbsp;&nbsp;&nbsp;&nbsp;일</p><table class="sign">${b.lines.map((l) => `<tr><td class="hd" style="width:35%">${esc(l.role)}</td><td>성명(Name):</td><td style="width:25%">(서명/Signature)</td></tr>`).join('')}</table>`;
    }
  }
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  @page{size:A4;margin:15mm 14mm}
  body{font-family:'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:9.5pt;color:#000;margin:0}
  h1{font-size:16pt;text-align:center;margin:0 0 4pt}.sub{text-align:center;color:#333;margin:0 0 12pt}
  h2{font-size:11.5pt;margin:14pt 0 5pt;padding-bottom:2pt;border-bottom:1.5px solid #000}
  table{border-collapse:collapse;width:100%;margin:0 0 6pt;table-layout:fixed}
  th,td{border:1px solid #000;padding:3pt 4pt;vertical-align:middle;word-break:break-all;font-size:8.8pt}
  th,.hd{background:#d9e2f3;font-weight:bold;text-align:center}.gap{background:#fff2cc}.c{text-align:center}
  thead{display:table-header-group} tr{break-inside:avoid}
  .sm{font-size:8.5pt;color:#333}.pb{break-after:page}.stmt{margin-top:18pt;text-align:center}.date{text-align:center;margin:8pt 0}
  .sign td{height:26pt}
  @media screen{body{max-width:900px;margin:20px auto;padding:0 16px}}
  </style></head><body>${body}</body></html>`;
}

export function printHtml(html: string) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 300);
  setTimeout(() => { try { w.print(); } catch { /* already printing */ } }, 1200);
  return true;
}

export { cellText };
