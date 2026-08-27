# Rezensions-Link-Generator

Wandelt Google-Maps-Links in Direktlinks um: einen zum Lesen der Rezensionen und
einen, der direkt das Bewertungsfenster öffnet. Dazu QR-Code, CSV-Export und eine
Merkliste.

Reine statische Seite. Kein Build, kein Server, kein API-Schlüssel, keine Daten
verlassen den Browser.

## Auf Vercel veröffentlichen

### Variante A – über GitHub (empfohlen)

1. Auf github.com ein neues, leeres Repository anlegen, z. B. `rezensions-links`.
2. Diesen Ordner hochladen – entweder per Weboberfläche über "uploading an existing file"
   oder im Terminal:

   ```bash
   git init
   git add .
   git commit -m "Rezensions-Link-Generator"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/rezensions-links.git
   git push -u origin main
   ```

3. Auf vercel.com mit dem GitHub-Konto anmelden, "Add New… → Project", das Repository
   auswählen.
4. Bei den Einstellungen nichts ändern. Framework Preset bleibt "Other", Build Command
   und Output Directory bleiben leer. Auf "Deploy".

Nach etwa 20 Sekunden liegt die Seite unter `projektname.vercel.app`. Jeder weitere
`git push` veröffentlicht automatisch die neue Fassung.

### Variante B – ohne GitHub

```bash
npm i -g vercel
vercel
```

Fragen mit Enter bestätigen, danach `vercel --prod` für die endgültige Adresse.

## Eigene Domain

In Vercel unter Settings → Domains die gewünschte Adresse eintragen, z. B.
`bewertung.deine-firma.de`, und beim Domain-Anbieter den angezeigten CNAME-Eintrag
setzen. Das Zertifikat stellt Vercel selbst aus.

## Aufbau

```
index.html            Die komplette Anwendung
vendor/qrcode.js      QR-Bibliothek von Kazuhiko Arase (MIT)
vendor/LICENSE-qrcode-generator.txt
vercel.json           Sicherheits-Header
```

## Zugriff beschränken

Die Seite ist öffentlich erreichbar. Über `<meta name="robots" content="noindex">` in der
`index.html` ist sie zwar von der Google-Suche ausgenommen, aber nicht geschützt.
Wer einen Passwortschutz braucht: In Vercel unter Settings → Deployment Protection lässt
sich "Password Protection" aktivieren (kostenpflichtiger Plan) oder "Vercel Authentication",
womit nur eingeloggte Teammitglieder Zugriff haben.

