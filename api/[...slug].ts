import app from "../server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Debug log to see what Vercel passes
  console.log("Incoming Vercel API Request:", req.method, req.url, req.query);

  // If Vercel stripped the /api prefix, add it back so Express routes match
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  
  return app(req, res);
}
