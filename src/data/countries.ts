// Manufacturing-site countries for overseas audits. `lang` = usual working language on site (for the interpretation path).
export interface Country { code: string; ko: string; en: string; lang: { ko: string; en: string } }

export const COUNTRIES: Country[] = [
  { code: 'KR', ko: '대한민국', en: 'Korea', lang: { ko: '한국어', en: 'Korean' } },
  { code: 'US', ko: '미국', en: 'United States', lang: { ko: '영어', en: 'English' } },
  { code: 'JP', ko: '일본', en: 'Japan', lang: { ko: '일본어', en: 'Japanese' } },
  { code: 'CN', ko: '중국', en: 'China', lang: { ko: '중국어', en: 'Chinese' } },
  { code: 'TW', ko: '대만', en: 'Taiwan', lang: { ko: '중국어(번체)', en: 'Chinese (Traditional)' } },
  { code: 'DE', ko: '독일', en: 'Germany', lang: { ko: '독일어', en: 'German' } },
  { code: 'IT', ko: '이탈리아', en: 'Italy', lang: { ko: '이탈리아어', en: 'Italian' } },
  { code: 'FR', ko: '프랑스', en: 'France', lang: { ko: '프랑스어', en: 'French' } },
  { code: 'CH', ko: '스위스', en: 'Switzerland', lang: { ko: '독일어·프랑스어', en: 'German / French' } },
  { code: 'IE', ko: '아일랜드', en: 'Ireland', lang: { ko: '영어', en: 'English' } },
  { code: 'NL', ko: '네덜란드', en: 'Netherlands', lang: { ko: '네덜란드어·영어', en: 'Dutch / English' } },
  { code: 'GB', ko: '영국', en: 'United Kingdom', lang: { ko: '영어', en: 'English' } },
  { code: 'SE', ko: '스웨덴', en: 'Sweden', lang: { ko: '스웨덴어·영어', en: 'Swedish / English' } },
  { code: 'DK', ko: '덴마크', en: 'Denmark', lang: { ko: '덴마크어·영어', en: 'Danish / English' } },
  { code: 'IL', ko: '이스라엘', en: 'Israel', lang: { ko: '히브리어·영어', en: 'Hebrew / English' } },
  { code: 'IN', ko: '인도', en: 'India', lang: { ko: '영어·힌디어', en: 'English / Hindi' } },
  { code: 'VN', ko: '베트남', en: 'Vietnam', lang: { ko: '베트남어', en: 'Vietnamese' } },
  { code: 'MY', ko: '말레이시아', en: 'Malaysia', lang: { ko: '영어·말레이어', en: 'English / Malay' } },
  { code: 'TH', ko: '태국', en: 'Thailand', lang: { ko: '태국어', en: 'Thai' } },
  { code: 'MX', ko: '멕시코', en: 'Mexico', lang: { ko: '스페인어', en: 'Spanish' } },
  { code: 'BR', ko: '브라질', en: 'Brazil', lang: { ko: '포르투갈어', en: 'Portuguese' } },
  { code: 'SA', ko: '사우디아라비아', en: 'Saudi Arabia', lang: { ko: '아랍어·영어', en: 'Arabic / English' } },
  { code: 'AU', ko: '호주', en: 'Australia', lang: { ko: '영어', en: 'English' } },
  { code: 'CA', ko: '캐나다', en: 'Canada', lang: { ko: '영어·프랑스어', en: 'English / French' } },
  { code: 'XX', ko: '기타', en: 'Other', lang: { ko: '현지어', en: 'Local language' } },
];
export const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c])) as Record<string, Country>;
const EU = ['DE', 'IT', 'FR', 'IE', 'NL', 'SE', 'DK'];

// Regulator home jurisdiction and its audit language
export const REG_HOME: Record<string, { countries: string[]; lang: { ko: string; en: string } }> = {
  MFDS: { countries: ['KR'], lang: { ko: '한국어', en: 'Korean' } },
  FDA: { countries: ['US'], lang: { ko: '영어', en: 'English' } },
  PMDA: { countries: ['JP'], lang: { ko: '일본어·영어', en: 'Japanese / English' } },
  ANVISA: { countries: ['BR'], lang: { ko: '포르투갈어·영어', en: 'Portuguese / English' } },
  SFDA: { countries: ['SA'], lang: { ko: '아랍어·영어', en: 'Arabic / English' } },
  EU_NB: { countries: EU, lang: { ko: 'NB 합의 언어(주로 영어)', en: 'Agreed with NB (usually English)' } },
  MHRA: { countries: ['GB'], lang: { ko: '영어', en: 'English' } },
  NMPA: { countries: ['CN'], lang: { ko: '중국어', en: 'Chinese' } },
  MDSAP: { countries: [], lang: { ko: '합의 언어(주로 영어)', en: 'Agreed language (usually English)' } },
};

/** Is this an overseas audit (site outside the regulator's own jurisdiction)? MDSAP has no home. */
export function isOverseas(reg: string, country: string) {
  const h = REG_HOME[reg];
  return !h || !country || country === 'XX' || !h.countries.includes(country);
}

export function interpPath(reg: string, country: string, lang: 'ko' | 'en') {
  const c = COUNTRY_BY_CODE[country];
  const r = REG_HOME[reg];
  if (!c || !r) return '';
  const from = c.lang[lang], to = r.lang[lang];
  return from === to ? (lang === 'ko' ? `${from} (통역 불필요)` : `${from} (no interpreter)`) : `${from} → ${to}`;
}
