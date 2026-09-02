/**
 * Löst Google-Maps-Kurzlinks (maps.app.goo.gl/…, goo.gl/maps/…) serverseitig auf.
 * Im Browser geht das nicht: Cross-Origin-Requests zu Google werden von CORS geblockt.
 *
 * Zwei Stufen, weil die Weiterleitung allein oft nicht reicht — in der EU landet
 * ein serverseitiger Abruf regelmäßig auf einer Consent-Seite ohne Kennung in der URL:
 *   1. Weiterleitung folgen, Ziel-URL prüfen.
 *   2. Reicht die nicht, das HTML nach einer Kennung durchsuchen.
 */

const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "maps.google.com"
]);

// Dieselben Muster, die das Frontend kennt — eine davon muss drin sein,
// damit sich ein Bewertungslink bauen lässt.
const ID_PATTERNS = [
  /!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  /[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i,
  /place_?id[:=]([A-Za-z0-9_-]{15,})/i,
  /!1s(Ch[A-Za-z0-9_-]{15,})/,
  /[?&]cid=(\d{5,})/
];

function hasUsableId(text) {
  return ID_PATTERNS.some(function (re) { return re.test(text); });
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

    // Stufe 1: Die Ziel-URL trägt die Kennung meistens schon.
    if (hasUsableId(response.url)) {
      return res.status(200).json({ url: response.url });
    }

    // Stufe 2: Consent-Seite oder Weiterleitung ohne Kennung — im HTML nachsehen.
    const html = await response.text();
    for (const re of ID_PATTERNS) {
      const hit = html.match(re);
      if (hit) {
        return res.status(200).json({ url: response.url, id: hit[0] });
      }
    }

    return res.status(422).json({ error: "Kennung nicht gefunden", url: response.url });
  } catch (err) {
    const aborted = err && err.name === "AbortError";
    return res.status(aborted ? 504 : 502).json({
      error: aborted ? "Zeitüberschreitung beim Auflösen" : "Kurzlink nicht erreichbar"
    });
  } finally {
    clearTimeout(timeout);
  }
}
