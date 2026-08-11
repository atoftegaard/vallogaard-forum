export const corsHandler = require('cors')({ origin: true });

export function setCorsResponseHeaders(res: any): void {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
}

// Returns false (after already writing the 400 response) when the request isn't a POST,
// so callers can just do "if (!requirePostMethod(req, res)) return;".
export function requirePostMethod(req: any, res: any): boolean {
    if (req.method !== 'POST') {
        res.status(400).send('Please send a POST request');
        return false;
    }
    return true;
}
