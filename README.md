# THE HAUNTED OFFICE

> Something strange is happening after working hours...

A static, interactive Halloween experience for remote teams. Pure HTML, CSS and vanilla JavaScript. No backend, no build step, no dependencies, no paid APIs.

## What is inside

- Cinematic intro: a haunted office building, flickering windows, fog, and a door that opens.
- Five explorable rooms: Reception, Meeting Room, Manager's Cabin (optional jump scare), Employee Desk, and a Locked Door with a riddle.
- Three mini-games: Who's Behind the Door?, a five-question Halloween quiz, and Find the Ghosts (five hidden across the office floor).
- A finale with confetti and a screenshot-friendly certificate, unlocked after all 8 challenges.
- Easter eggs: laughing pumpkins, pokeable bats, a talking moon, wandering ghosts, random light flickers.
- Optional haunted selfie (camera starts only after you press the button and allow it; photo upload works as a fallback).
- Share button: Web Share API with clipboard fallback.
- Synthesized sound (Web Audio), off until the first click, with a persistent on/off control. Jump scares have a visible on/off toggle.
- Respects `prefers-reduced-motion`.

Progress is stored in each person's own browser (`localStorage`). Nothing is shared between teammates.

## Project structure

```
index.html
css/style.css
js/app.js
assets/images/   door.jpg, graveyard.jpg, pumpkin.jpg
assets/sounds/   (empty: all sounds are generated in code)
README.md
```

All paths are relative, so it works from any GitHub Pages URL.

## Deploy on GitHub Pages

1. Create a new GitHub repository (for example `haunted-office`).
2. Upload the **contents** of this folder to the repository root, so `index.html` sits at the top level.
   ```bash
   git init
   git add .
   git commit -m "The Haunted Office"
   git branch -M main
   git remote add origin https://github.com/<your-username>/haunted-office.git
   git push -u origin main
   ```
3. On GitHub open **Settings, then Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main`, folder `/ (root)`, then **Save**.
5. Wait a minute or two. Your site is live at `https://<your-username>.github.io/haunted-office/`.
6. Send that single URL to your team.

## Run locally

Opening `index.html` directly works in most browsers. For the camera feature and the most faithful behavior, serve it:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Customize

- Quiz questions, riddle, room messages and jokes live at the top of `js/app.js` (`QUIZ`, `RIDDLE`, `GHOST_LINES`, `AGENDA`, `MOON`).
- The riddle answer is "ghost" (also accepts "a ghost").
- Colors are CSS variables at the top of `css/style.css`.

## Notes

- Headings use the Creepster font and body text uses Manrope, loaded from Google Fonts. If that is blocked, the page falls back to system fonts and stays fully usable.
- The three photos in `assets/images/` are the images supplied for this project, resized to JPEG for faster loading.
