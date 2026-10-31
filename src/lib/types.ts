export type FileKind = 'qm' | 'master' | 'sop' | 'unknown';
export type FileStatus = 'queued' | 'reading' | 'ocr' | 'done' | 'error' | 'unsupported';

export interface SourceFile {
  id: string;
  name: string;
  path: string; // relative path when uploaded as folder / zip
  ext: string;
  size: number;
  kind: FileKind;
  status: FileStatus;
  progress?: number;
  error?: string;
  text: string;
  /** spreadsheet rows (one array per sheet) */
  sheets?: { name: string; rows: string[][] }[];
  ocr?: boolean;
}

export type MatchSource = 'explicit' | 'qm' | 'master' | 'keyword' | 'ai' | 'manual';

export interface ClauseHit {
  clause: string;
  score: number; // 0..1
  source: MatchSource;
  evidence?: string;
  /** QM section that covers the clause, e.g. "5.3 Quality policy" */
  section?: string;
}

export interface DocRecord {
  key: string; // normalized doc no or file id
  title: string;
  titleKo?: string;
  docNo: string;
  version: string;
  revisionDate: string;
  fileIds: string[];
  fileNames: string[];
  hits: ClauseHit[];
  excerpt: string;
  lang?: string;
}

export interface AnalysisResult {
  docs: DocRecord[];
  createdAt: string;
  aiUsed: boolean;
  notes: string[];
}
