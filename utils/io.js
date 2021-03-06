const { Mongo, Firestore } = require('./db');
const fs = require('fs');
const util = require('util');
const exists = util.promisify(fs.exists);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const _ = require("lodash");

class Io {
    constructor() {
        //TODO: Figure out dependency injection for IO_SERVICE
        const services = {
            "firestore": () => new FirestoreWriter(),
            "mongo": () => new MongoWriter(),
            "file": () => new FileWriter()
        }
        if (!process.env.IO_SERVICE) {
            throw new Error("IO_SERVICE is empty!");
        }
        if (!services[process.env.IO_SERVICE]) {
            throw new Error("IO_SERVICE is invalid!");
        }
        this.service = services[process.env.IO_SERVICE]();
    }

    init = async () => await this.service.init();
}

class FirestoreWriter {
    constructor(links = []) {
        this.links = links;
        this.db = null;
        this.input = null;
        this.output = null;
        this.error = null;
        this.errorFatal = null;
    }

    async init() {
        const firestore = new Firestore();
        //Initialize database connection
        await firestore.init();
        this.db = firestore.db;

        this.input = this.db.collection("input");
        this.output = this.db.collection("output");
        this.error = this.db.collection("error");
        this.errorFatal = this.db.collection("error-fatal");

        const inputRef = await this.input.select('url').get();
        if (inputRef.empty) {
            throw new Error("Input not set!");
        }

        if (!this.links.length) {
            const inputs = inputRef.docs.map(doc => doc.data().url);
            const outputRef = await this.output.select('url').get();
            const outputs = outputRef.docs.map(doc => doc.data().url);
            this.links = _.shuffle(inputs.filter(source => !outputs.some(target => source === target)));
        }
    }

    //TODO: solve problem of setting input without calling init() at first place
    async setInput(data) {
        //TODO: consider refactoring this function to check if database input is empty
        if (!data && data.length === 0) {
            throw new Error("Source is empty!")
        }
        try {
            //Do batch insertion
            let batch = this.db.batch();
            data.forEach(async (doc) => {
                const ref = this.input.doc();
                batch.set(ref, doc);
            });
            await batch.commit();
        }
        catch (ex) {
            throw new Error(`Error appending to input collection! \n${ex}`);
        }
    }

    async appendOutput(data) {
        if (data.length) {
            try {
                //Do batch insertion
                let batch = this.db.batch();
                data.forEach(async (doc) => {
                    const ref = this.output.doc();
                    batch.set(ref, doc);
                });
                await batch.commit();
            }
            catch (ex) {
                throw new Error(`Error appending to input collection! \n${ex}`);
            }
        }
    }

    async appendError(data) {
        try {
            await this.error.add(data);
        }
        catch (ex) {
            throw new Error(`Error appending to error collection! \n${ex}`);
        }
    }

    async appendFatalError(data) {
        try {
            await this.errorFatal.add(data);
        }
        catch (ex) {
            throw new Error(`Error appending to fatal error collection! \n${ex}`);
        }
    }
}

class MongoWriter {
    constructor(links = []) {
        this.links = links;
        this.db = null;
        this.input = null;
        this.output = null;
        this.error = null;
        this.errorFatal = null;
    }

    async init() {
        const mongo = new Mongo();
        //Initialize database connection
        await mongo.init();
        this.db = mongo.db;

        this.input = this.db.collection("input");
        this.output = this.db.collection("output");
        this.error = this.db.collection("error");
        this.errorFatal = this.db.collection("error-fatal");

        if (!await this.input.countDocuments()) {
            throw new Error("Input not set!")
        }

        if (!this.links.length) {
            const inputs = await this.input.distinct("url");
            const outputs = await this.output.distinct("url");
            this.links = _.shuffle(inputs.filter(source => !outputs.some(target => source === target)));
        }
    }

    //Append input objects in JSON array format
    //TODO: solve problem of setting input without calling init() at first place
    async setInput(data) {
        //TODO: consider refactoring this function to check if database input is empty
        if (!data && data.length === 0) {
            throw new Error("Source is empty!")
        }
        await this.input.insertMany(data);
    }

    async appendOutput(data) {
        if (data.length) {
            await this.output.insertMany(data);
        }
    }

    async appendError(data) {
        await this.error.insertOne(data);
    }

    async appendFatalError(data) {
        await this.errorFatal.insertOne(data);
    }
}

class FileWriter {
    constructor(links = []) {
        this.links = links;
        this.input = [];
        this.output = [];
        this.error = [];
        this.errorFatal = [];
        this.inputPath = "input.json";
        this.outputPath = "output.json";
        this.errorPath = "error.json";
        this.errorFatalPath = "error-fatal.json";
    }

    async init() {
        //Create and load necessary IO files
        this.input = JSON.parse(await readFile(this.inputPath, { encoding: 'utf-8' }));
        if (!this.input.length) throw new Error("Source file is empty!");

        if (!await exists(this.outputPath)) await writeFile(this.outputPath, JSON.stringify(this.output));
        else this.output = JSON.parse(await readFile(this.outputPath, { encoding: 'utf-8' }));

        if (!await exists(this.errorPath)) await writeFile(this.errorPath, JSON.stringify(this.error));
        else this.error = JSON.parse(await readFile(this.errorPath, { encoding: 'utf-8' }));

        if (!await exists(this.errorFatalPath)) await writeFile(this.errorFatalPath, JSON.stringify(this.errorFatal));
        else this.errorFatalPath = JSON.parse(await readFile(this.errorFatalPath, { encoding: 'utf-8' }));

        if (!this.links.length) {
            //TODO: filter() or map() could be a bottleneck when dealing with large JSONs
            const inputs = this.input.map(json => json.url);
            const outputs = this.output.map(json => json.url);
            this.links = _.shuffle(inputs.filter(source => !outputs.some(target => source === target)));
        }
    }

    async appendOutput(data) {
        this.output.push(...data);
        await writeFile(this.outputPath, JSON.stringify(this.output));
    }

    async appendError(data) {
        this.error.push(data);
        await writeFile(this.errorPath, JSON.stringify(this.error));
    }

    async appendFatalError(data) {
        this.errorFatal.push(data);
        await writeFile(this.errorFatalPath, JSON.stringify(this.errorFatal));
    }
}

module.exports = Io;