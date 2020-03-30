const MongoClient = require('mongodb').MongoClient;

class Mongo {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is empty!");
        }
        if (!process.env.MONGO_COLLECTION) {
            throw new Error("MONGO_COLLECTION is empty!");
        }

        const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        
        this.db = await client.db(process.env.MONGO_COLLECTION);
        console.log("Connected to Mongo DB!");
    }
}

module.exports = Mongo;