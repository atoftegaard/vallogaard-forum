export interface Dokument {
  title: string;
  category?: string;
  filename: string;
  path: string;
  size: number;
  uploadedAt: Date;
  ref: string;
  contentType?: string;
  contentDisposition?: string;
  // True for documents stored under the admin-only Storage prefix (see storage.rules).
  bestyrelsen?: boolean;
}

// Board-only documents always carry this category. It is set by the upload's "kun for
// bestyrelsen" checkbox, never picked or typed by hand.
export const BESTYRELSEN_CATEGORY = 'Bestyrelsen';

// Board-only documents live under their own Storage prefix that only admins can
// read/list/write - it isn't just hidden client-side. This is a flag on a document,
// independent of its category.
export const BESTYRELSEN_STORAGE_PATH = 'dokumenter-bestyrelse';
