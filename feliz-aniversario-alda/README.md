# Feliz Aniversário, Alda! (Unity WebGL)

Kurzes, charmantes Geburtstags-Minispiel fuer Alda.

## Status

- Unity-Skripte angelegt (`Assets/Scripts/`)
- Ablauf, UI, Figur-Animation, Partikel und einfache 5-Ton-Melodie umgesetzt
- WebGL-kompatibler Aufbau ohne Plugins und ohne Plattform-APIs

## Enthaltene Klassen

- `GameManager`: Flow/States, Audio-Melodie, Partikel-Trigger, Szene-Bootstrap
- `UIController`: Canvas, Texte, Buttons und Klick-Callbacks
- `AnimationController`: Torero-Style Figur aus Platzhalter-Shapes und Performance-Animation

## Unity Setup (kurz)

1. In Unity ein Projekt oeffnen (Built-in 3D reicht).
2. Diese Skripte nach `Assets/Scripts/` kopieren.
3. Neue Szene erstellen und **AldaBirthdayScene** nennen.
4. Leeres GameObject `GameManager` anlegen und Script `GameManager` anhaengen.
5. Szene speichern und in Build Settings an erste Position setzen.
6. Platform auf WebGL wechseln und Build in diesen Ordner exportieren (z. B. Unterordner `Build/`).

## Text-Flow im Spiel

- Titel: `Feliz Aniversário, Alda!`
- Button 1: `Ständchen starten`
- Nachricht 1: `Alles Liebe fuer dich, Alda - heute wird gelacht, getanzt und gefeiert.`
- Button 2: `Für Alda 🎉`
- Nachricht 2: `Alda, du bist einfach klasse: warmherzig, lebendig und immer für ein Lächeln gut.`

## WebGL Hinweis

Audio startet browserkonform erst nach User-Interaktion (Klick auf den Start-Button).
