'use strict';
require('dotenv').config()
const { MongoWriter, FirestoreWriter, FileWriter } = require('./utils/io');
const Monitor = require('./utils/monitor');
const Scraper = require('./utils/scraper');
const Parser = require('./parser');

const main = async () => {
    try {
        const io = new FirestoreWriter();
        await io.load();

        const monitor = new Monitor();
        const parser = new Parser();
        const scraper = new Scraper(parser, io, monitor);

        await scraper.load();
        await scraper.run();
    }
    catch (err) {
        console.log(`Error catched: ${err}\nStack: ${err.stack}`);
    }
}

main();