import type { Block } from '../report';

export type DocFmt = 'hwpx' | 'docx' | 'pdf';

export async function renderBlocks(blocks: Block[], fmt: DocFmt, title: string): Promise<Blob> {
  if (fmt === 'hwpx') return (await import('./hwpx')).toHwpx(blocks, title);
  if (fmt === 'docx') return (await import('./docx')).toDocx(blocks);
  return (await import('./pdf')).toPdf(blocks);
}

export async function printBlocks(blocks: Block[], title: string): Promise<boolean> {
  const { toHtml, printHtml } = await import('./html');
  return printHtml(toHtml(blocks, title));
}
