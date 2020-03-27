# tarantula

A Node-based web crawler for data extraction using pool of links.

- Install packages
```
npm install
```

- Run crawler
```
npm run start
```

### Notes
The web crawler gets the pool of links as an input array and fires requests over ScraperApi service. Inside configuration file you can set preferred number of requests that run concurrently as well as other flags. It is possible to use Mongo database (Firestore coming soon!) as well as native Node file methods. Monitor is used to handle different process timings and calculate adaptive delay between requests. 
The only thing left to users is the implementation of ```Parser``` class - probably used for JSON or HTML parsing. For latter, I recommend using ```cheerio```.

Let me know about any suggestion on how to make tarantula better. Cheers =)

### Todos
- implement Firestore integration
- resolve various TODOs along the codebase