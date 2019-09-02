import * as functions from 'firebase-functions';
import { environment } from '../../src/environments/environment';

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
 
        const name = req.body.data.name;
        const email = req.body.data.email;
        const address = req.body.data.address;
		console.log('applyForUser called with body', JSON.stringify(req.body));

        admin.firestore().collection('profiles').add({
            'name': name,
            'email': email,
            'address': address,
            'image': 'https://api.adorable.io/avatars/40/' + email + '.png',
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
    });    
});
