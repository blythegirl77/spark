# Spark My Marketing

Single-page site for the "Writing for Connection" 7-day email course. Plain HTML/CSS/JS, no build step: open `index.html` or serve the folder.

- `index.html`, `style.css`, `script.js`: the page
- `assets/`: logo, mascot, calendar and arrow graphics (extracted from the design PDF)

## Connect the form to Brevo
1. In Brevo, create a form (Contacts > Forms) and copy its `https://XXXX.sibforms.com/serve/...` URL.
2. Paste it into the `action` of the `<form>` in `index.html` (already done for the current form).
3. Fields are `FIRSTNAME` and `EMAIL`; they need to match your Brevo contact attributes.

## Fonts
Free Google Fonts stand-ins are used. To swap, edit the `<link>` in `index.html` and the three `--font-*` variables at the top of `style.css`.

## Colors
`#161c24` ink, `#31425f` blue, `#da55a7` pink.
