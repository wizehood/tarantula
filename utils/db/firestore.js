const admin = require('firebase-admin');

class Firestore {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        //Relate to https://firebase.google.com/docs/firestore/quickstart#initialize
        let serviceAccount = require('./firestore-setup.json');
        // if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        // }
        this.db = admin.firestore();
        console.log("Connected to Firestore DB!");
    }
}

module.exports = Firestore;