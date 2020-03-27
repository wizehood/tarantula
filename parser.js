const cheerio = require('cheerio');

//A template of provisionary parser
class Parser {
    constructor() { }

    async processData(response) {
        try {
            if (response.data && response.data.results && response.data.results.length) {
                const infos = [];
                //Set source url for each result in array of results
                response.data.results.forEach(result => {
                    const {
                        id,
                        name,
                        homepage_url,
                        location,
                        image,
                        bio,
                        genres,
                        fb_share_url,
                        public_email,
                        booking_email,
                        mngt_email
                    } = result;

                    const regex = /\S*\.com\S*/g;
                    //Specifically take these out of bio
                    const uris = bio.match(regex) || [""];
                    const websites = uris.filter(x => !x.includes("@")).join("\n") || null;
                    const emails = uris.filter(x => x.includes("@")).join("\n") || null;

                    const info = {
                        id,
                        name,
                        homepage_url: homepage_url.replace("//", ""),
                        city: location.city || null,
                        state: location.state || null,
                        country: location.country || null,
                        image: image.replace("//", ""),
                        bio,
                        genres: genres.join("\n") || null,
                        public_fb: fb_share_url || null,
                        public_email: [public_email, booking_email, mngt_email].join("\n").trim() || null,
                        other_websites: websites,
                        other_emails: emails,
                        url: response.headers['sa-final-url'],
                        datetime: new Date().toISOString(),
                    }
                    infos.push(info);
                });
                return infos;
            }
            return null;
        }
        catch (err) {
            console.log("Error while parsing " + err.stack);
            throw "Parsing exception thrown!";
        }
    }
}

module.exports = Parser;