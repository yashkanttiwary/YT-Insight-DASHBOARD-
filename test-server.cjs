const express = require('express');
const app = express();
app.all("/api/status", (req, res) => res.json({ ok: true, url: req.url }));
app.all("*", (req, res) => res.json({ fallback: true, url: req.url }));
const http = require('http');
http.createServer(app).listen(3001, () => {
    console.log("Listening on 3001");
});
