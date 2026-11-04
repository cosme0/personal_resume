# Ken Kevin Cabanalan — portfolio + 3D companion

A single-page portfolio with page-like navigation, a dark cyan theme, and a
full-body 3D robot that hovers in the corner and waves when you change pages.

Built with plain HTML, CSS and JavaScript. Three.js is bundled locally, and the
robot is assembled in code from simple shapes, with glowing eyes and a mouth
line on its curved visor screen. The site works offline once loaded (the
Google Fonts request is the only optional network dependency).

**Live content:** third-year student developer, GitHub
[@cosme0](https://github.com/cosme0).

## Run it locally

```bash
node server.js
```

Then open **http://localhost:5173**.

If port 5173 is already in use, pick another one:

```powershell
$env:PORT=8080; node server.js
```

> A local server is required: ES modules and the browser's import map do not
> work when opening `index.html` directly from disk (`file://`).

## Structure

```
index.html                 All page content lives here
css/style.css              Theme, layout, transitions, responsive rules
js/main.js                 Mobile nav, scroll reveals, copy email, contact form
js/router.js               Hash routing + page transition orchestration
js/avatar.js               Three.js scene + the animated robot companion
js/assistant.js            Robot chat: Puter.js answers, speech, fallbacks
js/vendor/                 Three.js runtime (bundled locally)
assets/images/             Portrait photo (used for the About section)
assets/images/projects/    Screenshots shown on the project cards
assets/resume.pdf          Placeholder CV (replace with your real one)
server.js                  Zero-dependency local dev server
```

## Still to personalise

The site is already filled in with Ken's full name, email, GitHub, skills,
projects, student bio and education (BS in Information Technology, Global
Reciprocal Colleges, Caloocan — expected 2028). These items are intentionally
still placeholders:

| What | Where | Replace with |
|---|---|---|
| `assets/resume.pdf` | Download CV button | Real CV (keep the filename or update the link) |

Contact email: `kenkevincabanalan0@gmail.com` — if it changes, update
`index.html` (hero, about, contact) and the fallback in `js/main.js`.

About photo: `assets/images/resume picture.jpg`, referenced as
`resume%20picture.jpg`. It is used for the About portrait only — the robot has
no photo on its face. Keep the filename or update the `src` in the About
section if you replace it.

Other optional updates:

- Experience timeline in the About section, once you have internships or work
  to list.
- Project descriptions in the Projects section — the current wording is
  cautious because the GitHub repos have no README files.
- A social preview image (`og:image`) after deploying.

## Robot chat (KC)

The robot answers questions about Ken. Click the robot or the **Ask KC** pill
next to it to open the chat.

Answers come from [Puter.js](https://developer.puter.com), which runs in the
browser. That keeps the site static: there is no backend and no API key in the
repository. Puter uses a user-pays model, so a visitor signs in to a free Puter
account the first time the AI is used — the "Sign in to chat" button in the
panel handles that. Until then, and whenever the AI call fails or times out,
the robot answers from the local table in `js/assistant.js`.

- Persona and facts: `SYSTEM_PROMPT` and `PROFILE` in `js/assistant.js`.
- Offline answers: the `FALLBACKS` array in the same file.
- Voice: the speaker button in the panel header uses the browser's speech
  synthesis. It is off by default and remembered per browser; the robot's
  mouth animates while it talks either way.
- Nothing about the conversation is stored on the site — history lives in the
  page and is cleared on reload.

## Customise the 3D companion

The companion is not a downloaded model, and it does not use the portrait
photo. `js/avatar.js` builds a robot from Three.js primitives — brushed metal
chassis, glowing cyan core, antenna and ear pods — with a dark glass visor
holding two glowing eyes and a small mouth line.

- Colours, materials and body parts live in `buildRobot()`.
- The hover, eye glances and blinks, core pulse, scan band, antenna and wave
  are in `animate()`.
- The eye and mouth shapes are built next to the visor in `buildRobot()`.
- If WebGL is unavailable the companion simply does not appear; no photo
  fallback is shown.

The old `assets/models/avatar.glb` file is no longer loaded and can be deleted
if you do not want to keep it as a backup.

## How the navigation works

Routes are hash-based (`#/`, `#/projects`, `#/about`, `#/contact`), so the page
never reloads. When you navigate, the router:

1. fires an `avatar:wave` event (the avatar waves),
2. fades the old page out,
3. swaps in the new page, updates the title/description and scrolls to top.

If the browser reports `prefers-reduced-motion: reduce`, transitions become
instant and the avatar stays still.

The companion also fades to 12% opacity when your pointer is near it or when a
contact-form field is focused, so it never hides content you are reading or
typing. On desktop and tablet the contact page reserves a right-hand rail for
it, keeping the form completely clear.

## Deploy

The site is live at **https://cosme0.github.io/personal_resume/**.

Every push to `main` runs `.github/workflows/deploy-pages.yml`, which copies
the static files and publishes them to GitHub Pages. There is no build step.
To publish a change, commit and push:

```bash
git add -A && git commit -m "Update content" && git push
```

Progress and history: the repository's **Actions** tab. Any other static host
still works too — the folder can be dragged into Netlify or Cloudflare Pages
unchanged. If you move to a custom domain, update `og:url`, the canonical link
and the `url` in the structured-data block in `index.html`.

## Credits

- Avatar: custom Three.js robot built for this site, with a glowing visor face.
- [Three.js](https://threejs.org/) — MIT license.
- Fonts: Inter and Space Grotesk via Google Fonts (optional).
# personal_resume
# personal_resume
# personal_resume
