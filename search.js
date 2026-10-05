const https = require('https');
https.get('https://html.duckduckgo.com/html/?q=youtube+api+detect+shorts', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const matches = data.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi) || [];
    console.log(matches.slice(0, 5).join('\n'));
  });
});
