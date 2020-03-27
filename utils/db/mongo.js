const MongoClient = require('mongodb').MongoClient;

class MongoDb {
    constructor() {
        this.db = null;
    }

    async init() {
        if (!process.env.MONGO_URI) {
            throw new Error("Database connection string is empty!");
        }
        if (!process.env.MONGO_COLLECTION) {
            throw new Error("Database collection name is empty!");
        }

        const client = new MongoClient(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

        await client.connect();
        this.db = await client.db(process.env.MONGO_COLLECTION);
        console.log("Connected to Mongo DB!");
    }
}

module.exports = MongoDb;