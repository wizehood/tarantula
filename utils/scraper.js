'use strict';
const _ = require('lodash');
const beep = require('beepbeep');
const axios = require('axios');
const util = require('util');
const UserAgent = require('user-agents');
const beepAsync = util.promisify(beep);

class Scraper {
    constructor(
        parser,
        io,
        monitor
    ) {
        /*
            NOTES:
            parser - parser used for processing response
            io - object representing service for I/O operations with files/database
            monitor - object representing monitor service for dealing with timings 
            apiKey - api key for ScraperApi service
            requestCount - number of requests fired concurrently
            
            inputChunks - array of arrays (size of requestCount) containing urls, used for firing multiple requests
            userAgents - array of available User-Agent headers
            acceptHeaders - array of available Accept headers
            retryFailed - toggle if failed requests (4xx/5xx) should be retried until success
            keepHeaders - toggle preservation of original request headers
            renderPage - toggle ScraperApi to render pages
        */
        this.parser = parser;
        this.io = io;
        this.monitor = monitor;
        this.apiKey = process.env.SCRAPERAPI_KEY;
        this.requestCount = eval(process.env.REQUEST_COUNT);

        this.inputChunks = [];
        this.userAgents = [];
        this.acceptHeaders = [];
        this.retryFailed = eval(process.env.RETRY_FAILED);
        this.keepHeaders = eval(process.env.KEEP_HEADERS);
        this.renderPage = eval(process.env.RENDER_PAGE);
    }

    async run() {
        console.log(`Firing IP test...`);
        await this.checkIp();

        await this.monitor.setStartTime();
        console.log(`Current time: ${this.monitor.currentTimeFormatted}`);

        for (let i = 0; i < this.inputChunks.length; i++, this.monitor.processedCount = this.inputChunks[i].length) {
            await this.monitor.setPassedTime();
            await this.monitor.setAverageRequestTime();
            await this.monitor.setEtaTime(this.inputChunks.length);
            await this.monitor.setLeftTime(this.inputChunks.length);

            console.log(`\nChunks: ${i + 1}/${this.inputChunks.length} (${(((i + 1) / this.inputChunks.length) * 100).toFixed(2)}%, ${this.monitor.processedLinkCount} urls processed) 
            (passed:    ${this.monitor.passedTimeFormatted}) 
            (now:       ${this.monitor.currentTimeFormatted}) 
            (eta:       ${this.monitor.etaDays}days ${this.monitor.etaMilisecondFormatted}) 
            (left:      ${this.monitor.leftDays}days ${this.monitor.leftMilisecondFormatted}) 
            (avg/loop:  ${this.monitor.averageLoopTime}ms) 
            (avg/write: ${this.monitor.averageWriteTime}ms)\n`);

            const promises = await this.getPromises(this.inputChunks[i]);
            const responses = await this.execute(promises);
            let successResponses = responses.filter(response => !!response);

            //Get url of failed responses
            if (this.retryFailed) {
                //Map urls that have nullable/falseable responses
                const failedUrls = responses.map((el, index) => el ? false : urls[index]).filter(Boolean);
                if (failedUrls.length) {
                    await this.sleep(this.maxDelay);
                    const fixedResponses = await this.handleFails(failedUrls);
                    successResponses.push(...fixedResponses);
                }
            }
            //Flat responses 
            successResponses = successResponses.flat();

            await this.monitor.setStartWriteTime();
            await this.io.appendOutput(successResponses);
            await this.monitor.setAverageWriteTime();
        }
        console.log(`End time: ${this.monitor.currentTimeFormatted}`);
    }

    async load() {
        if (!process.env.SCRAPERAPI_KEY) {
            throw new Error("SCRAPERAPI_KEY is empty!");
        }

        console.log(`Input array length: ${this.io.links.length}`);
        console.log(`Concurrent request length: ${this.requestCount}`);

        console.log("Chunking input array...");
        const tempArr = this.io.links;
        while (tempArr.length) {
            this.inputChunks.push(tempArr.splice(0, this.requestCount));
        }

        //Fill array user agents
        const userAgent = new UserAgent({ deviceCategory: "desktop" })
        this.userAgents = _.uniq(Array(100).fill().map(() => userAgent().toString()));

        //Set request accept headers
        this.acceptHeaders = [
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8"
        ];
    }

    async getPromises(source) {
        const promises = [];

        for (let i = 0; i < source.length; i++) {
            //Queue requests one after another with custom delay in between
            //Toggle in case of strictly fixed delays. TODO: refactor
            //this.monitor.adaptiveDelay += Math.floor(Math.random() * (this.monitor.maxDelay - this.monitor.minDelay)) + this.monitor.minDelay;
            const promise = () => new Promise(resolve => setTimeout(() => resolve(this.getRequest(source[i])), this.monitor.adaptiveDelay))
            promises.push(promise);
            console.log(`URL: ${source[i]} (now: ${this.monitor.currentTimeFormatted}) (delay: ${this.monitor.adaptiveDelay}ms)`);
        }
        return promises;
    }

    async getRequest(url) {
        const baseUrl = `https://api.scraperapi.com/?api_key=${this.apiKey}&url=${url}${this.renderPage ? "&render=true" : ''}${this.keepHeaders ? "&keep_headers=true" : ''}`;
        const encodedUrl = encodeURI(baseUrl);

        await this.monitor.setRequestStartTime();

        const config = {
            headers: {
                "accept": this.acceptHeaders[Math.floor(Math.random() * this.acceptHeaders.length)],
                "user-agent": this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
                "x-contact-info": 'Research purpose explicitly. Webmaster: ',
            }
        }

        return axios.get(encodedUrl, config)
            .then(async (response) => {
                const info = await this.parser.processData(response);
                await this.monitor.setAdaptiveDelay();
                console.log(`DONE: ${url} (now: ${this.monitor.currentTimeFormatted})`);
                return info;
            })
            .catch(async (err) => {
                if (err.response && err.response.status) {
                    const message = `[${this.monitor.currentTimeFormatted}] HTTP ERROR ${err.response.status}: ${url}\n(body: ${err.response.data})\nmessage:${err.message}\n`;
                    console.log(message);
                    await this.io.appendError({ message });
                    return null;
                }
                if (err.stack.match(/socket hang up/i)) {
                    console.error(`[${this.monitor.currentTimeFormatted}] SOCKET ERROR: ${url}\n${err}`);
                    if (err.response && err.response.status) {
                        console.error(`[${this.monitor.currentTimeFormatted}] SOCKET ERROR: STATUS ${err.response.status}`);
                    }
                    return null;
                }
                await beepAsync(4, 1500);
                await this.io.appendFatalError({ message: `[${this.monitor.currentTimeFormatted}] GENERAL ERROR: ${url}\n${err.stack}` });
                throw new Error("Fatal error, stopping the process!");
                //TODO: Should we use process.exit to instantly terminate parallel processes?
                // process.exit(1);
            });
    }

    async handleFails(urls) {
        const validResponses = [];
        let pending = true;
        //Get failed responses (HTTP 5xx) or socket errors, put those promises in a pool and execute again
        while (pending) {
            console.log(`Number of requests failed: ${urls.length}`);
            const promises = await this.getPromises(urls);
            const responses = await this.execute(promises);

            validResponses.push(...responses.filter(response => !!response));
            pending = responses.filter(response => !response).length > 0;
        }
        return validResponses;
    }

    async execute(promises) {
        //TODO: Triggering by map() can be a bit clumsy, consider finding other way
        return Promise.all(promises.map(p => p())).then(async (values) => {
            return values;
        });
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkIp() {
        return await axios.get('https://api.ipify.org/?format=json')
            .then((response) => {
                console.log("Public IP: " + response.data.ip)
            })
            .catch((err) => {
                console.log(err.stack);
                throw "Can't get IP";
            })
    }
}

module.exports = Scraper;