const moment = require('moment');

class Monitor {
    /*
      NOTES:
      processedLinkCount - count of processed links in current session
      adaptiveDelay - initial value of adaptive delay (alternative is minDelay/maxDelay)
      minDelay - minimum time to defer request 
      maxDelay - maximum time to defer request 

      startTime - session start time
      passedTime - total time passed from the beginning of current session
      requestStartTime - request start time
      writeStartTime - IO-write start time
      averageRequestTime - average request time
      averageWriteTime - average IO-write time

      etaMiliseconds - predicted miliseconds till end of current session
      etaDays - estimated days till end of current session
      leftMiliseconds - same as estimated time minus the passed time (intentionally left for comparison purpose)
      leftDays - same as estimated time minus the passed time (intentionally left for comparison purpose)
    */
    constructor() {
        this.processedLinkCount = 0;
        this.adaptiveDelay = 0;
        this.minDelay = 2000;
        this.maxDelay = 8000;

        this.startTime = null;
        this.passedTime = null;
        this.requestStartTime = null;
        this.writeStartTime = null;
        this.averageRequestTime = 0;
        this.averageWriteTime = 0;

        this.etaMiliseconds = 0;
        this.etaDays = 0;
        this.leftMiliseconds = 0;
        this.leftDays = 0;
    }

    set processedCount(count) {
        this.processedLinkCount += count;
    }

    async setStartTime() {
        this.startTime = moment();
    }

    get currentTimeFormatted() {
        return moment().format("HH:mm:ss");
    }

    async setPassedTime() {
        if (!this.startTime) {
            throw new Error("Start time not set!");
        }
        this.passedTime = moment().diff(this.startTime);
    }

    get passedTimeFormatted() {
        //TODO: find better moment.format() time duration -> always use moment.utc when showing duration!
        return moment.utc(this.passedTime).format("HH:mm:ss");
    }

    async setAverageRequestTime() {
        this.averageRequestTime += this.adaptiveDelay;
    }

    get averageLoopTime() {
        return ((this.averageRequestTime / this.processedLinkCount) || 0).toFixed();
    }

    async setEtaTime(inputSize) {
        //Use the pipeline operator since passed/0 === Infinity. Also predict time for 1st loop!
        this.etaMiliseconds = (((this.averageRequestTime / this.processedLinkCount) | 0) * inputSize) || (this.maxDelay * inputSize);
        this.etaDays = Math.floor(moment.duration(this.etaMiliseconds).asDays()).toFixed();
    }

    get etaMilisecondFormatted() {
        return moment(this.etaMiliseconds).format("HH:mm:ss");
    }

    async setLeftTime(inputSize) {
        //Use the pipeline operator since passed/0 === Infinity. Also predict time for 1st loop!
        this.leftMiliseconds = (((this.averageRequestTime / this.processedLinkCount) | 0) * Math.abs(inputSize - this.processedLinkCount));
        this.leftDays = Math.floor(moment.duration(this.leftMiliseconds).asDays()).toFixed();
    }

    get leftMilisecondFormatted() {
        return moment(this.leftMiliseconds).format("HH:mm:ss");
    }

    async setStartWriteTime() {
        this.writeStartTime = moment();
    }

    async setAverageWriteTime() {
        if (!this.writeStartTime) {
            throw new Error("Write start time not set!");
        }
        this.averageWriteTime = moment().diff(this.writeStartTime);
    }

    async setRequestStartTime() {
        this.requestStartTime = moment();
    }

    async setAdaptiveDelay() {
        this.adaptiveDelay = moment().diff(this.requestStartTime);
    }
}

module.exports = Monitor;