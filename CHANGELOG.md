# Changelog

## 0.10 — 2026-08-06
- Initial pre-release scaffold, extracted from the reference installation.
- Engine: conductor (v4.24-derived) + conductor-lib + web app + kiosk frame pages.
- De-personalized: all LAN IPs, hostnames, HA entity ids, personal media references, and credentials removed from code and shipped config; `MA_TOKEN`/`MA_URL` read from environment.
- Docs: README, INSTALL, HA-SETUP, ARCHITECTURE, THEMES (pack format v1), SECURITY, ROADMAP.
- Docker packaging and generic display-PC kiosk kit.
- Example theme skeleton (`themes/ocean-depths/`) pending hand-built starter packs.
