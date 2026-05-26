# Greenboard

# 🌱 GreenBoard – Internes Nachhaltigkeits-Dashboard

Herzlich willkommen im Entwicklungs-Repository des **GreenBoards**! Dieses Dashboard dient zur automatisierten, internen Auswertung unserer Nachhaltigkeitsumfragen (z. B. aus Microsoft Forms). Es visualisiert Daten zu Mobilität, Dienstreisen, Homeoffice und Papierverbrauch in modernen Diagrammen.


---



## 📊 Anforderungen an die Excel-Struktur (Für Admins)

Damit das Board die Spalten der Excel-Tabelle automatisch zuordnen kann, müssen die Fragen in Microsoft Forms so formuliert sein, dass die Spaltenüberschriften folgende Schlagworte enthalten (Groß-/Kleinschreibung egal):

* **Abteilung:** Muss das Wort `abteilung` enthalten.
* **Zeitstempel:** Muss `startzeit`, `start` oder `zeit` enthalten.
* **Identifikation:** Muss `mail` oder `name` enthalten (wird genutzt, um Doppeleinträge automatisch zu bereinigen).
* **Anfahrt:** Muss die Begriffe `verkehrsmittel` und `arbeit` enthalten.
* **Dienstreise:** Muss das Wort `dienstreise` enthalten.
* **Homeoffice:** Muss das Wort `homeoffice` enthalten (Werte von 0 bis 5).
* **Drucken:** Muss `seiten` oder `gedruckt` enthalten.

---

## 🛠️ Workflow für uns Entwickler (Mitarbeit am Code)

Wir nutzen GitHub, um das Board gemeinsam weiterzuentwickeln und Fehler zu beheben. 

1. **Hauptdatei:** Der gesamte Code (HTML, CSS-Styling und JavaScript-Logik) liegt in der **`index.html`**. Die `.ipynb`-Datei ist nur ein Überbleibsel aus Google Colab und kann ignoriert werden.
2. **Nicht direkt auf `main` arbeiten:** Der `main`-Branch enthält immer die aktuell stabile Version, die bei den Kollegen im Einsatz ist.
3. **Branches nutzen:** Wenn du etwas ändern oder ausprobieren möchtest, erstelle einen eigenen Branch (z. B. `feature-neues-design` oder `bugfix-formel`).
4. **Pull Requests:** Wenn deine Änderungen fertig sind, erstelle einen *Pull Request* in den `main`-Branch, damit wir den Code kurz zu zweit prüfen können, bevor wir ihn freigeben.
5. **Rollout:** Sobald Änderungen in den `main`-Branch fließen, lädt einer von uns die neue `index.html` herunter und stellt sie den Kollegen (z. B. auf dem Netzlaufwerk) zur Verfügung.

---
*🌱 Für eine grünere Zukunft im Unternehmen.*
