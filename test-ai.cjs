const http = require('http');

const data = JSON.stringify({
  videos: [
    { id: "1", title: "Testing Minecraft", tags: ["minecraft", "gaming"] },
    { id: "2", title: "New Mechanical Keyboard", tags: ["tech", "keyboard"] }
  ]
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai-categorize-videos',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
