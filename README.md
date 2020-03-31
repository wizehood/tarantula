# tarantula

A Node-based web crawler for data extraction using pool of links.

- Install packages
```
npm install
```

- Create ```.env``` file inside root with following config and set necessary variables:
```
IO_SERVICE=<firestore,mongo,file>
MONGO_URI=<your_mongo_connection_string>
MONGO_COLLECTION=<your_mongo_collection>
SCRAPERAPI_KEY=<your_scraperapi_api_key>
REQUEST_COUNT=1
RETRY_FAILED=false
KEEP_HEADERS=false
RENDER_PAGE=false
```

- Run crawler
```
npm run start
```

### Notes
The web crawler gets the pool of links as an input array and fires requests over ScraperApi service. 
You can utilize Mongo cluster or Google Firestore database as well as native Node file methods. 
```Monitor``` class is used to handle different process timings and calculate adaptive delay between requests. 
The only thing left to users is the bare implementation of ```Parser``` class, used for JSON or HTML parsing. For latter, I recommend using ```cheerio``` npm package.

Let me know about any suggestion on how to make tarantula better. Cheers =)

### Todos
* [x] implement Firestore integration
* [ ] implement dependency injection for DB service
* [x] implement ESLint
* [ ] resolve various TODOs along the codebase