# Littleleaf HTML handbook

Open `index.html` in a browser. Keep the `assets/` folder and all eight HTML pages together. Reading, navigation, diagrams, and the booking simulation require no network connection, build step, clinic server, or external library.

For predictable browser storage across chapters, run an optional local static server:

```sh
cd /Users/divyansh/Downloads/helloDr/docs/training/html
python3 -m http.server 8767 --bind 127.0.0.1
```

Open http://127.0.0.1:8767/index.html. Press Ctrl+C in the serving terminal to stop it. If Python is not on PATH on this computer, use `/Users/divyansh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` instead of `python3`.

Chapter completion is stored only in this browser. Private browsing and file-URL storage policies may prevent persistence or sharing progress between pages. Lessons remain readable without storage. Search covers all chapter section titles. Copy buttons use browser clipboard support with a selection fallback. Print / Save PDF prints the current chapter; it is not an all-chapters PDF export.

## Contents

1. `index.html` — course orientation
2. `foundations.html` — web concepts and architecture
3. `code-walkthrough.html` — actual code and interactive request flow
4. `data-security.html` — database relationships, constraints, access, tests
5. `operating-guide.html` — commands, debugging, builds, hosting
6. `practice-labs.html` — six ordered editing exercises
7. `clients-interviews.html` — demonstrations, tradeoffs, roadmap, interviews
8. `cheatsheet.html` — quick reference

## Maintain the handbook

The Markdown files in the parent directory remain the main lesson source. `build.py` adds the visual diagrams, navigation, and review questions and generates the HTML pages. It uses only Python's standard library and supports the Markdown syntax used by these notes. It is not intended as a general-purpose Markdown converter.

```sh
python3 build.py
python3 verify.py
```

Edit colors/layout in `assets/guide.css`, interactions in `assets/guide.js`, and diagram definitions in `build.py`. Regenerate after editing lesson Markdown or diagram definitions. Changes made directly to generated HTML are overwritten on regeneration.

The handbook is published at https://littleleaf-ruchi-lamyan.divyansh-kumar70.chatgpt.site/guide/index.html without login. The clinic hosting build copies the eight HTML pages and browser assets into `/guide/`; edit the source here and rebuild to publish updates. External links are references or explicitly labeled destinations; opening them requires connectivity.
