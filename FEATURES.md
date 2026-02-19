# NØDE / MyTube – Feature-Übersicht

## ✅ Aktive Features (implementiert)

### Navigation & Layout
- **Header** – Logo, Suchleiste (⌘K), Theme-Toggle, Benachrichtigungen, Avatar → Settings
- **Sidebar** – Home, Shorts, Your creators, Library, Explore
- **Responsives Layout** – Mobile-Menü (Hamburger nur auf Handy), kollabierbare Sidebar
- **Command Menu (⌘K)** – Suche, Quick Actions (Theme, History löschen), Kategorien, Seiten-Navigation

### Home & Entdecken
- **Home** – Trending (regionabhängig), Kategorien (All, Trending, Music, Gaming, News, etc.)
- **Featured Video** – Smart-Pick aus History oder Trending
- **Region/Sprache** – 25 Länder, sofortige Aktualisierung bei Wechsel
- **Infinite Scroll** – Lade mehr beim Scrollen
- **Kategorien** – 17 Kategorien mit Icons

### Video-Wiedergabe
- **VideoPlayer** – Play/Pause, Fortschrittsbalken, Lautstärke, Vollbild
- **Video-Streaming** – Piped API (HLS/DASH), oEmbed-Fallback
- **Related Videos** – „Up next“ mit horizontalem Scroll

### Channel
- **Channel-Seite** – Banner, Avatar, Beschreibung, Tabs (Videos, About)
- **Favorite-Button** – Creator favorisieren (Herz), erscheint in Sidebar & Subscriptions
- **Infinite Scroll** – Weitere Channel-Videos laden

### Nutzerdaten (localStorage)
- **Username** – In Settings setzbar, Avatar-Initialen im Header
- **History** – Automatisch beim Anschauen, mit Suche & Datumsfilter
- **Wiedergabeposition** – Fortsetzen wo du aufgehört hast (Pause/Seek)
- **Favorites (Liked)** – Like-Button auf Watch-Seite
- **Watch Later** – Über Save-Button, Videos entfernen möglich
- **Playlists** – Erstellen, Videos hinzufügen, Playlist-Seite
- **Favorite Creators** – Herz auf Channel-Seite, Sidebar, Subscriptions-Seite

### Suche
- **Suchseite** – Infinite Scroll, regionabhängige Ergebnisse
- **Command Menu** – Live-Suche mit Vorschlägen

### Kommentare
- **Kommentare** – Laden, „Load more“, HTML-Formatierung (Links, Zeilenumbrüche)

### UI/UX
- **Dark/Light Mode** – Theme-Toggle
- **Glass-Design** – Sidebar, Header, Badges
- **Animations** – Framer Motion, sanfte Übergänge
- **Echte Thumbnails** – YouTube maxresdefault mit Fallback
- **Channel-Avatare** – Piped API für echte Avatare

---

## ❌ Fehlende / Unvollständige Features

### Kurzfristig (Quick Wins)
1. **Shorts** – Nur Platzhalter „Coming soon“, keine Shorts-API
2. **Dislike-Button** – UI vorhanden, keine Funktion
3. ~~**Share-Button**~~ – ✅ Web Share API mit Fallback (Copy / neuer Tab)
4. ~~**Subscribe auf VideoInfo**~~ – ✅ Favorite/Heart-Button (wie auf Channel)
5. ~~**Playlists-Thumbnails**~~ – ✅ Nutzt `getFallbackThumbnail` (YouTube-URL) für echte Video-IDs
6. ~~**Create Playlist (PlaylistsPage)**~~ – ✅ Implementiert (Modal öffnet, Playlist erstellen)
7. ~~**Premium / Gaming / Live / News**~~ – ✅ Leiten zu Home mit passender Kategorie
8. ~~**Today's News**~~ – ✅ 6 Top-Headlines (GNews API) bei News-Kategorie

### Mittelfristig
9. **Benachrichtigungen** – Icon im Header, keine Funktion
10. **Create-Button** – Im Header, keine Funktion
11. ~~**Playlist bearbeiten**~~ – ✅ Umordnen (↑↓), Umbenennen, Löschen
12. ~~**Video aus Playlist entfernen**~~ – ✅ Remove-Button auf VideoCard
13. ~~**Wiedergabeposition speichern**~~ – ✅ Fortsetzen wo du aufgehört hast (localStorage)
14. ~~**Untertitel**~~ – ✅ Transcript-Panel rechts, per Toggle (VTT/JSON3)
15. **Qualitätsauswahl** – Kein manueller Wechsel (720p, 1080p, etc.)
16. ~~**Download**~~ – ✅ yt-dlp (MP3/WAV/MP4, Qualitätsauswahl)

### Langfristig / Nice-to-have
17. **Echte Shorts** – Vertikale Videos, Swipe-Navigation
18. **Live-Chat** – Bei Livestreams
19. **Backend/Account** – Aktuell nur localStorage, keine Sync zwischen Geräten
20. **Keyboard Shortcuts** – Leertaste Play/Pause, F Vollbild (teilweise im Player)
21. **Picture-in-Picture** – Mini-Player beim Scrollen
22. ~~**Autoplay**~~ – ✅ Countdown + nächstes Video automatisch

---

## 🔧 Bekannte technische Punkte

- **Piped API** – Externe Instanzen, können 500er liefern → oEmbed-Fallback für Video-Details
- **Download (yt-dlp)** – Braucht `yt-dlp` und `ffmpeg` installiert. Dev: `npm run dev:all` oder separat `npm run server`
- **GNews API** – Heute’s News braucht GNEWS_API_KEY (kostenlos bei gnews.io)
