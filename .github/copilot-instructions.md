# Copilot Agent Instructions

## Shell commands

- **Never use `pkill` or `killall`** — these commands are blocked by the runner firewall.
  - To kill a process, first find its PID with `ps aux | grep <name> | grep -v grep | awk '{print $2}'`, then kill it with `kill <PID>`.
  - If no PID is found, the process is already gone — proceed without killing anything.

## Playwright / browser tool

- When `browser_navigate` returns "Browser is already in use", call `browser_close` once, then retry `browser_navigate`.
- If `browser_close` does not resolve the lock after one retry, **skip the visual screenshot step entirely** and move on. A screenshot is a "nice to have" — do not block progress or loop indefinitely trying to take one.

## Repository structure

- This repo is static HTML/JS games; no build step is required.
- Each game lives in its own subfolder (e.g. `space-blaster/`) with at minimum an `index.html`.
- The root `index.html` is the landing page that links to all published games.
- Games currently listed on the homepage: `space-blaster`, `futuristic-pong`, `gravity-painter`, `one-sentence-life`, `galactic-gemini`, `el-torero-slots`.
