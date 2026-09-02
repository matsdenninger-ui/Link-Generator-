/**
 * Holt zu einem Google-Maps-Link serverseitig zwei Dinge, die der Browser selbst
 * nicht bekommt (Cross-Origin-Requests zu Google blockt CORS):
 *
 *   1. Die aufgelöste Adresse hinter einem Kurzlink (maps.app.goo.gl/…).
 *   2. Die Place ID der Eintragung.
 *
 * Punkt 2 ist der wichtigere. Aus einer Place ID lässt sich
 * search.google.com/local/writereview?placeid=… bauen, und das öffnet den
 * Bewertungsdialog auch im normalen Browser. Die aus einer Hex-Kennung gebaute
 * Alternative google.com/maps/place//data=…!12e1 ist dagegen ein Deeplink in die
 * Maps-App — ohne installierte App landet man dort schnell bei einer
 * Installationsaufforderung statt beim Bewerten.
 */

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "maps.google.com"
]);

// Kennungen, aus denen das Frontend irgendeinen Link bauen kann.
const ID_PATTERNS = [
  /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  /[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  /place_?id[:=]([A-Za-z0-9_-]{15,})/i,
  /!1s(Ch[A-Za-z0-9_-]{15,})/,
  /[?&]cid=(\d{5,})/
];

/* Place IDs von Unternehmen beginnen praktisch immer mit ChIJ. Andere Präfixe
   (GhIJ, Ei…) stehen für Adressen und Wegpunkte, die sich nicht bewerten
   lassen — die interessieren hier also nicht. */
const PLACE_ID_RE = /\b(ChIJ[A-Za-z0-9_-]{16,})/;

function findId(text) {
  for (const re of ID_PATTERNS) {
    const hit = text.match(re);
    if (hit) return hit[0];
  }
  return null;
}

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Parameter url fehlt" });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Keine gültige Adresse" });
  }

  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(400).json({ error: "Nur Google-Maps-Links werden aufgelöst" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 8000);

  try {
    const response = await fetch(parsed.href, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Ohne Desktop-User-Agent liefert Google eine abgespeckte Seite ohne Kennung.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "de-DE,de;q=0.9"
      }
    });

    const finalUrl = response.url;
    const out = { url: finalUrl };

    // Steht die Place ID schon in der Ziel-URL, reicht das.
    const inUrl = finalUrl.match(PLACE_ID_RE);
    if (inUrl) {
      out.placeId = inUrl[1];
      return res.status(200).json(out);
    }

    // Sonst im HTML nachsehen — dort steht sie fast immer.
    const html = await response.text();

    const inHtml = html.match(PLACE_ID_RE);
    if (inHtml) out.placeId = inHtml[1];

    // Ohne Place ID wenigstens irgendeine Kennung mitgeben, damit das Frontend
    // den bisherigen Maps-Link bauen kann statt gar nichts.
    if (!out.placeId) {
      const fallback = findId(finalUrl) || findId(html);
      if (!fallback) {
        return res.status(422).json({ error: "Kennung nicht gefunden", url: finalUrl });
      }
      out.id = fallback;
    }

    return res.status(200).json(out);
  } catch (err) {
    const aborted = err && err.name === "AbortError";
    return res.status(aborted ? 504 : 502).json({
      error: aborted ? "Zeitüberschreitung beim Auflösen" : "Kurzlink nicht erreichbar"
    });
  } finally {
    clearTimeout(timeout);
  }
}
