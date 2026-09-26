export interface Referat {
  // Firestore document id (added when reading, not stored in the document itself)
  id?: string;
  title: string;
  from: Date;
  uploadedAt: Date;
  ref?: string;
}
