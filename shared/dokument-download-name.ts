// Uploaded files are stored under a GUID, so the name a browser saves them as has to come from
// the Content-Disposition metadata that Firebase Storage sends along with the download.

const EXTENSIONS_BY_CONTENT_TYPE: { [contentType: string]: string } = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'application/vnd.ms-excel.sheet.macroenabled.12': '.xlsm',
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/rtf': '.rtf',
  'text/rtf': '.rtf',
  'message/rfc822': '.eml',
  'application/vnd.ms-outlook': '.msg',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/tiff': '.tif'
};

// Many older uploads have a missing or generic contentType (empty, application/octet-stream),
// so the extension can't come from that. File formats start with fixed signatures ("magic
// bytes"), which is what's used to work it out instead.
function latin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

// Pass the first few KB of the file. Returns '' when the format isn't recognised.
// (Old .doc/.xls/.ppt all share one container signature - see sniffOleExtension.)
export function sniffExtension(head: Uint8Array): string {
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) { return '.pdf'; }              // %PDF
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47])) { return '.png'; }
  if (startsWith(head, [0xff, 0xd8, 0xff])) { return '.jpg'; }
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) { return '.gif'; }              // GIF8
  if (startsWith(head, [0x7b, 0x5c, 0x72, 0x74, 0x66])) { return '.rtf'; }        // {\rtf
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && latin1(head.subarray(8, 12)) === 'WEBP') { return '.webp'; }
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) {
    // .docx/.xlsx/.pptx are zip files; the entry names in the zip headers give away which.
    const names = latin1(head);
    if (names.includes('word/')) { return '.docx'; }
    if (names.includes('xl/')) { return '.xlsx'; }
    if (names.includes('ppt/')) { return '.pptx'; }
    return '.zip';
  }
  return '';
}

export function isOleContainer(head: Uint8Array): boolean {
  return startsWith(head, OLE_SIGNATURE);
}

// Old Office files: the stream names inside the container (stored as UTF-16, which is why the
// zero bytes are dropped) say which application wrote it. Needs a larger part of the file
// than sniffExtension, since the directory isn't at the start.
export function sniffOleExtension(bytes: Uint8Array): string {
  const text = latin1(bytes).replace(/\0/g, '');
  if (text.includes('WordDocument')) { return '.doc'; }
  if (text.includes('PowerPoint Document')) { return '.ppt'; }
  if (text.includes('Workbook') || /\bBook\b/.test(text)) { return '.xls'; }
  return '';
}

// Types that can safely be shown in the browser tab (they can't run script in the page).
export const INLINE_TYPES_BY_EXTENSION: { [extension: string]: string } = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif'
};

export function extensionOf(fileName: string): string {
  const match = fileName.match(/\.[^.\\/]+$/);
  return match ? match[0] : '';
}

export function extensionForContentType(contentType?: string): string {
  return (contentType && EXTENSIONS_BY_CONTENT_TYPE[contentType.split(';')[0].trim().toLowerCase()]) || '';
}

// "inline" keeps documents opening in the browser tab as before; browsers still use the
// filename when the user saves them. filename* carries the real (UTF-8) name, plain filename
// is an ASCII fallback for clients that don't understand it.
export function buildContentDisposition(title: string, extension: string): string {
  const safeTitle = title.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim();
  const fullName = safeTitle + extension;
  const asciiName = fullName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fullName)}`;
}
