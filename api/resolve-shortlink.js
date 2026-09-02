/**
 * Resolves Google Maps short links (maps.app.goo.gl/...) to their full URLs
 * by following redirects server-side to avoid CORS issues
 */

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  // Only allow maps.app.goo.gl URLs for safety
  if (!url.includes('maps.app.goo.gl') && !url.includes('goo.gl')) {
    return res.status(400).json({ error: 'Only Google Maps short links are supported' });
  }

  try {
    // Follow the redirect without returning the redirect response
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to resolve URL' });
    }

    const finalUrl = response.url;
    return res.status(200).json({ url: finalUrl });
  } catch (error) {
    console.error('Error resolving shortlink:', error);
    return res.status(500).json({ error: 'Failed to resolve shortlink' });
  }
}
