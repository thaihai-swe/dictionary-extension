const HTML_TAG_RE = /<[^>]*>/g;
const QUOT_RE = /&quot;/g;
const AMP_RE = /&amp;/g;
const APOS_RE = /&#39;/g;
const LT_RE = /&lt;/g;
const GT_RE = /&gt;/g;
const WS_RE = /\s+/g;

export function stripHtml(html: string): string {
  HTML_TAG_RE.lastIndex = 0;
  QUOT_RE.lastIndex = 0;
  AMP_RE.lastIndex = 0;
  APOS_RE.lastIndex = 0;
  LT_RE.lastIndex = 0;
  GT_RE.lastIndex = 0;
  WS_RE.lastIndex = 0;
  return String(html || '')
    .replace(HTML_TAG_RE, '')
    .replace(QUOT_RE, '"')
    .replace(AMP_RE, '&')
    .replace(APOS_RE, "'")
    .replace(LT_RE, '<')
    .replace(GT_RE, '>')
    .replace(WS_RE, ' ')
    .trim();
}
