(function() {
  'use strict';

  let express = require('express'),
    app = express(),
    request = require('request'),
    cheerio = require('cheerio'),
    Mustache = require('mustache'),
    port = process.env.PORT || 8000;

  let getItems = (scrapeUrl, callback) => {

    let scrape = (error, response, html) => {
      if (!error) {
        let $ = cheerio.load(html);

        let objectify = (idx, item) => {

          let url = scrapeUrl + $(item).attr('href');
          url = url.replace(/ /g, '%20');
          if (!url.match(/\.mp3$/gi)) {
            return;
          }

          let linkText = $(item).text();
          let titleMatches = linkText.match(/(.+)\.mp3$/);
          let title = titleMatches ? titleMatches[1] : "";
          let dateMatches = linkText.match(/\[([0-9\.]+)\]/);
          let date = dateMatches ? dateMatches[1].replace(/\./g, '-') : "";

          return {
            'title': title,
            'date': date,
            'link': url
          };
        };

        let items = $('a').map(objectify).get();

        callback(items);
      } else {
        callback([]);
      }
    };
    request(scrapeUrl, scrape);
  };

  let rssStartTemplate = '<?xml version="1.0" encoding="UTF-8"?>\
<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" version="2.0">\
<channel>\
<title>{{scrapeTitle}}</title>\
<description>{{scrapeDescription}}</description>\
<link>{{scrapeUrl}}</link>\
<language>en-us</language>\
<copyright>Copyright</copyright>\
<lastBuildDate>{{currentDate}}</lastBuildDate>\
<pubDate>{{currentDate}}</pubDate>\
<docs>{{docs}}</docs>\
<webMaster>{{webMaster}}</webMaster>\
<ttl>60</ttl>\
<itunes:author>{{author}}</itunes:author>\
<itunes:subtitle></itunes:subtitle>\
<itunes:summary></itunes:summary>\
<itunes:owner>\
   <itunes:name></itunes:name>\
   <itunes:email></itunes:email>\
</itunes:owner>\
<itunes:explicit>No</itunes:explicit>\
<itunes:image href="http://www.placekitten.com/600/600"/>';

  let rssEndTemplate = '</channel>\
</rss>';

  let itemTemplate = '<item>\
<title>{{title}}</title>\
<link>{{link}}</link>\
<guid>{{link}}</guid>\
<description>{{title}} (scraped from HTML)</description>\
<enclosure url="{{link}}" type="audio/mpeg"/>\
<category>Podcasts</category>\
<pubDate>{{date}}</pubDate>\
<itunes:author>{{author}}</itunes:author>\
<itunes:explicit>No</itunes:explicit>\
<itunes:subtitle>{{title}}</itunes:subtitle>\
<itunes:summary>{{title}}</itunes:summary>\
</item>';

  app.get('/scrape', (req, res) => {
    console.log(new Date());
    console.log(req.query);

    let scrapeUrl = 'http://archives.bassdrivearchive.com/' + req.query.path;
    let data = {
      scrapeTitle: req.query.title,
      scrapeUrl: scrapeUrl,
      scrapeDescription: req.query.description || req.query.title,
      currentDate: new Date().toUTCString(),
      author: 'BassDrive'
    };

    let itemsToResponse = (items) => {
      let tempItems = items.map( (item) => {
        let d = new Date(item.date);
        item.prettyDate = item.date;
        return item;
      } );
      let feedItems = tempItems.map( (item) => (Mustache.render(itemTemplate, item)) );

      let feed = Mustache.render(rssStartTemplate, data)
        + feedItems.join(' ')
        + Mustache.render(rssEndTemplate, data);

      res.set('Content-Type', 'application/xml');
      res.send(feed);
    };

    getItems(scrapeUrl, itemsToResponse);
  });

  app.use(express.static(__dirname + '/'));

  app.listen(port);

}).call(this);