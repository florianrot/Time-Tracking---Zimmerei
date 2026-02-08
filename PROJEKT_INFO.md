# 🛠️ Zeiterfassung Zimmerei – Dokumentation

Diese App wurde als **privates Projekt** entwickelt, um die bisherige manuelle Dateneingabe direkt in Google Sheets durch eine effiziente, mobile Lösung zu ersetzen. Gleichzeitig diente dieses Projekt als **Einstieg**, um die Möglichkeiten von KI-basierten Entwicklungswerkzeugen wie **Claude Code, Antigravity und Codex** kennenzulernen.

## 🌟 Hauptfunktionen

### 1. Mobile-First Design (PWA)
- **Standalone App**: Kann als App auf dem Homescreen installiert werden (iPhone & Android).
- **Vollbildmodus**: Keine störenden Browser-Leisten – volle Konzentration auf die Zeiterfassung.
- **Dark Mode**: Ein edles, augenschonendes Design in dunklen Tönen mit klaren Kontrasten.

### 2. Intelligente Zeiterfassung
- **Automatisches Datum**: Beim Öffnen erkennt die App automatisch das aktuelle Datum. Die Uhrzeit-Felder starten leer (`--:--`), um eine saubere Erfassung zu ermöglichen.
- **Präzisions-Picker**: Eigens entwickelte "Wheel-Picker" für Datum und Uhrzeit, die eine schnelle Auswahl ermöglichen, ohne dass die Bildschirmtastatur stört.
- **Automatische Berechnung**: Die App berechnet sofort die geleisteten Stunden basierend auf "Von" und "Bis".
- **Mitternachts-Check**: Automatische Erkennung von Arbeitszeiten, die über Mitternacht hinausgehen.

### 3. Effiziente Verwaltung
- **Monatsansicht**: Eine übersichtliche Liste aller Einträge, gruppiert nach Monaten.
- **Multi-Select & Bulk-Delete**: Mehrere Einträge gleichzeitig auswählen und löschen, um Ordnung zu halten.
- **Echtzeit-Dashboard**: Sofortige Anzeige der Gesamtstunden und des verdienten Lohns für den aktuellen Monat.

### 4. Professioneller Excel-Export
- **Präzises Styling**: Exportiert fertige `.xlsx` Dateien mit Firmen-Header, sauber formatierten Tabellen und automatischen Total-Berechnungen.
- **Buchhaltungsfertig**: Enthält Datum, Arbeitszeiten, Stunden, laufende Summen und den Netto-Lohn in CHF.
- **Kein Gitternetz**: Ein sauberer, moderner Look ohne überflüssige Rahmenlinien.

### 5. Cloud-Synchronisation (Google Sheets)
- **Google Sheets als Backend**: Alle Daten werden sicher in deiner eigenen Google Tabelle gespeichert.
- **Monatliche Trennung**: Das Google Script erstellt automatisch für jeden Monat ein eigenes Tabellenblatt.
- **Konfigurierbar**: Über die App-Einstellungen kann die Google-Schnittstelle und der Stundenlohn jederzeit angepasst werden.

## 🛠️ Technische Highlights
- **Sprachen**: HTML5, CSS3 (Vanilla), JavaScript (ES6+), Google Apps Script.
- **Installation**: Gehostet via GitHub Pages für maximale Verfügbarkeit und einfache Updates.
- **Datenschutz**: Alle Einstellungen und Daten werden lokal im `localStorage` gepuffert und mit deiner privaten Google Cloud synchronisiert.

---
**Entwickelt für Effizienz auf der Baustelle und Klarheit im Büro.**
