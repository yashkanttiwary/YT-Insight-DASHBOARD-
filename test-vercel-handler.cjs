const handler = require('./dist/server.cjs').default;
const http = require('http');

http.createServer((req, res) => {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  handler(req, res);
}).listen(3002, () => {
  console.log("Listening on 3002");
});
