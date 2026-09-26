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
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif'
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
