import app from "../server";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  // If Vercel stripped the /api prefix (e.g. req.url is /youtube instead of /api/youtube),
  // we add it back so Express app.all("/api/youtube") can match it properly.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url === '/' ? '' : req.url);
  }
  
  return app(req, res);
}
