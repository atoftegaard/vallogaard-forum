import * as functions from 'firebase-functions/v1';
import { db } from './firebase-admin';

// Transcribed from the same håndskrevet liste dateret 26.01.2024 as the original
// lejligheder seed data ("Vallogaard_Lejligheder.xlsx"), "Beboer(e)" / "Telefon/mobilnr."
// / "E-mailadresse" columns. Empty string means the source list had nothing recorded.
const DETAILS_BY_ADDRESS: { [adresse: string]: { beboere: string; telefonnummer: string; email: string } } = {
    'Valløvej 4, st.tv.': { beboere: 'Ole / Annemette Gleerup', telefonnummer: '51233007', email: 'annemette@gleerup.it' },
    'Valløvej 4, st.th.': { beboere: 'Jan Nilsson', telefonnummer: 'Anna 29727606', email: 'jan@aspon.dk' },
    'Valløvej 4, 1.tv.th.': { beboere: 'Anni Christensen', telefonnummer: '30284982', email: 'annival@youmail.dk' },
    'Valløvej 4, 1.th.': { beboere: 'Kirsten Juel Nielsen', telefonnummer: '26925273', email: 'kirstenjueln@gmail.com' },
    'Valløvej 4, 2.tv.': { beboere: 'Henrik W. Gleerup', telefonnummer: '20486472', email: 'henrik@gleerup.it' },
    'Valløvej 4, 2.th.': { beboere: 'Dominique Meincke', telefonnummer: '60651117', email: 'dominique.meincke@hotmail.com' },
    'Valløvej 2, st.tv.': { beboere: 'Stine Jensen / Rolf P. Svensson', telefonnummer: '20401151 / 40253693', email: 'stinejensen70@gmail.com / rolf94@gmail.com' },
    'Valløvej 2, st.th.': { beboere: 'ABBV APS, Anders Beier', telefonnummer: '28888622', email: 'ab@bbolig.dk' },
    'Valløvej 2, 1.tv.': { beboere: 'Morten Dam Vestergaard / Maria Ysasi Cillero', telefonnummer: '28913534 / 42743622', email: 'morten.dam.vestergaard@gmail.com' },
    'Valløvej 2, 1.th.': { beboere: 'Line Iversen', telefonnummer: '25317973', email: 'iversenline@hotmail.com' },
    'Valløvej 2, 2.tv.': { beboere: 'Anne Birgitte Steen Hansen', telefonnummer: '51918137', email: 'annesteenhansen@gmail.com' },
    'Valløvej 2, 2.th.': { beboere: 'Johan Braüner Nielsen', telefonnummer: '22842734', email: 'jbraunern@icloud.com' },
    'Brønshøjvej 16, st.tv.': { beboere: 'Marina Mitova', telefonnummer: '', email: '' },
    'Brønshøjvej 16, st.th.': { beboere: 'Hanne Ewald', telefonnummer: '61781812', email: 'hfcwald@gmail.com' },
    'Brønshøjvej 16, 1.tv.': { beboere: 'Peter W. Gleerup', telefonnummer: '40199924', email: 'peter@gleerup.it' },
    'Brønshøjvej 16, 1.th.': { beboere: 'Thomas Feveile', telefonnummer: '', email: 'tfeveile@hotmail.com' },
    'Brønshøjvej 16, 2.tv.': { beboere: 'Andreas / Cecilie Toftegaard', telefonnummer: '61240125', email: 'toftegaardandreas@gmail.com' },
    'Brønshøjvej 16, 2.th.': { beboere: 'Lene Hald', telefonnummer: '24696849', email: 'lene.hald.2710@gmail.com' },
    'Brønshøjvej 14, st.tv.': { beboere: 'Christian Kallehauge / Maja Kallehauge', telefonnummer: '', email: '' },
    'Brønshøjvej 14, st.th.': { beboere: 'Kim Vistisen / Lone Vistisen', telefonnummer: '51559781', email: '' },
    'Brønshøjvej 14, 1.tv.': { beboere: 'Nusrat Ali / Asif Muhammad', telefonnummer: '38337000 / 61685027', email: 'nulleali16@hotmail.com' },
    'Brønshøjvej 14, 1.th.': { beboere: 'Ruth Cyano', telefonnummer: '20491068', email: 'ruthcyano@gmail.com' },
    'Brønshøjvej 14, 2.tv.': { beboere: 'Birgitte Jahn', telefonnummer: '20156162', email: 'birgittejahn@hotmail.com' },
    'Brønshøjvej 14, 2.th.': { beboere: 'Casper Frederick Menzies / Nina Baun Jeppesen', telefonnummer: '23644033 / 22141037', email: '' },
    'Valløvej Garage': { beboere: 'Ole Gleerup / Ole Bøgemose', telefonnummer: 'Ole B. 51235642', email: '' },
    'Værelser, ABBV APS': { beboere: 'Anders Beier', telefonnummer: '28888622', email: 'ab@bbolig.dk' }
};

// One-time backfill of the "beboere"/"telefonnummer"/"email" fields onto existing lejligheder
// docs - not part of the app's feature set. Only ever fills in a field that's still undefined,
// so it can never clobber a value an admin has since edited through the app. Delete this file
// (and its export in index.ts) after the one run.
export const backfillLejlighedDetails = functions.https.onRequest(async (req: any, res: any) => {
    if (req.method !== 'POST') {
        res.status(400).send('Please send a POST request');
        return;
    }
    if (req.get('x-backfill-token') !== process.env.BACKFILL_LEJLIGHED_DETAILS_TOKEN) {
        res.status(403).send('Forbidden');
        return;
    }

    const snap = await db.collection('lejligheder').get();
    const updated: string[] = [];
    const skippedAlreadySet: string[] = [];
    const skippedUnknown: string[] = [];

    const batch = db.batch();
    for (const docSnap of snap.docs) {
        const data = docSnap.data();

        if (data.beboere !== undefined && data.telefonnummer !== undefined && data.email !== undefined) {
            skippedAlreadySet.push(docSnap.id);
            continue;
        }

        const details = DETAILS_BY_ADDRESS[data.adresse];
        if (!details) {
            skippedUnknown.push(docSnap.id);
            continue;
        }

        const fields: { [key: string]: string } = {};
        if (data.beboere === undefined) {
            fields.beboere = details.beboere;
        }
        if (data.telefonnummer === undefined) {
            fields.telefonnummer = details.telefonnummer;
        }
        if (data.email === undefined) {
            fields.email = details.email;
        }

        batch.update(docSnap.ref, fields);
        updated.push(docSnap.id);
    }
    await batch.commit();

    res.status(200).send({ updated, skippedAlreadySet, skippedUnknown });
});
