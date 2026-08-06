# Contributing

Thanks for wanting to help build Roomscape.

## Ways to contribute
- **Theme packs** — the most wanted contribution. Follow [docs/THEMES.md](docs/THEMES.md); share packs via Discussions. Media must be CC0/own-work/properly licensed, declared in the pack's `LICENSES.md`. Franchise-themed packs must use the "prompts, not pixels" model — no copyrighted media in the pack.
- **Hardware reports** — Roomscape was built on one six-TV install. Reports from different TVs, GPUs, and layouts (with your `config` + what broke) are gold.
- **Code** — see ROADMAP.md for what's in flight. Open an issue before large PRs.

## Code ground rules
- **Zero runtime npm dependencies** in the conductor core (`sharp`/`mqtt` stay optional). This is a deliberate feature.
- Node ≥16, plain JS, no build step for the frontend.
- New API routes go through the central router (`modules/`), not `prependListener`.
- Single-source registries: frame kinds, viz styles, palettes each have one definition; don't add a copy.
- No hardcoded frame ids, counts, entity ids, or IPs — everything resolves from layout/config.
- Version headers: bump the touched file's header version in the same PR.

## Filing issues
Include: your layout (frames/walls), server platform, HA version, browser/kiosk details, and `GET /api/health` + relevant `GET /api/log` output.
