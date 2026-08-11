import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// firebase-admin's classic admin.firestore()/admin.auth() namespace API stopped reliably
// attaching via plain require('firebase-admin') under v14 - the modular getFirestore()/
// getAuth() accessors are the officially supported replacement.
initializeApp();

export const db = getFirestore();
export const auth = getAuth();
