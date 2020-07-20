import * as functions from 'firebase-functions';
import { environment } from '../../src/environments/environment';
import { Profile } from '../../src/app/core/models/profile.model';

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
admin.initializeApp();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: environment.emailconfig.username,
        pass: environment.emailconfig.password
    }
});

exports.applyForUser = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }

		console.log('applyForUser called with body', JSON.stringify(req.body));

        const name = req.body.data.name;
        const email = req.body.data.email;
        const address = req.body.data.address;
        const image = 'https://api.adorable.io/avatars/40/' + email + '.png';

        admin.auth().createUser({
            email: email,
            emailVerified: false,
            password: 'testtest',
            displayName: name,
            photoURL: image,
            disabled: false
          }).then((userRecord: any) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            admin.firestore().collection('profiles').doc(userRecord.uid).set({
                'name': name,
                'email': email,
                'address': address,
                'image': image,
                'notifyAboutNewArticles': true,
                'notifyAboutNewComments': true,
                'uid': 'pending'
              })
              .then(() => {
                console.log('profile added');
                const dest = req.body.data.destination;
                const mailOptions = {
                    from: 'Valløgaard Forum <andreas@toftegaard.it>',
                    to: dest,
                    subject: 'Anmodning om brugeroprettelse',
                    html: `Der er kommet en anmodning om brugeroprettelse fra "` + name + `" - check <a href="https://console.firebase.google.com/project/vallogaard-2019/database/firestore/data~2Fprofiles">https://console.firebase.google.com/project/vallogaard-2019/database/firestore/data~2Fprofiles</a>`
                };
        
                return transporter.sendMail(mailOptions, (error: any) => {
                    if(error){
                        console.log('sendMail error', error.toString());
                        return res.status(500).send(error.toString());
                    }
                    return res.send('OK');
                });
              })
              .catch((error: any) => {
                console.log('collection error', error);
                return res.status(500).send(error.toString());
              });
        }).catch((error: any) => {
            console.log('Error creating new user:', error);
        });
    });    
});

exports.notifyNewArticle = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }
 
        const articlename = req.body.data.articlename;
        const articleurl = req.body.data.articleurl;
        const authorname = req.body.data.authorname;
        const authoruid = req.body.data.authoruid;
       
        console.log('notifyNewArticle called with body', JSON.stringify(req.body));
        
        admin.firestore().collection('profiles', (ref: any) => ref.where('notifyAboutNewArticles', '==', true)).get()
        .then((snap: any) => {
            if (snap.empty) {
                return;
            }
            snap.forEach((doc: any) => {
                let profile = doc.data() as Profile;
                if (profile.uid === authoruid) {
                    return;
                }
                const mailOptions = {
                    from: 'Valløgaard Forum <andreas@toftegaard.it>',
                    to: profile.email,
                    subject: 'Nyt opslag fra ' +  authorname,
                    html: `<p>Hej ${profile.name}</p><p>${authorname} har lavet <a href="${articleurl}">opslaget ${articlename}, klik her for at se det.</a></p>`
                };
        
                return transporter.sendMail(mailOptions, (error: any) => {
                    if(error){
                        console.log('sendMail error', error.toString());
                        return res.status(500).send(error.toString());
                    }
                    return res.send('OK');
                });
            });
        });
    });    
});