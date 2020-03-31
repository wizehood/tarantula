'use strict';
require('dotenv').config();
const Io = require('./utils/io');
const Monitor = require('./utils/monitor');
const Scraper = require('./utils/scraper');
const Parser = require('./parser');

const main = async () => {
	try {
		const io = new Io();
		await io.init();

		const parser = new Parser();
		const monitor = new Monitor();
		const scraper = new Scraper(parser, io, monitor);

		await scraper.init();
		await scraper.run();
	}
	catch (err) {
		console.log(`Error catched: ${err}\nStack: ${err.stack}`);
	}
};

main();