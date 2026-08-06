# Security model — read before deploying

**Version 0.10**

## What Roomscape is, security-wise

A trusted-LAN home appliance, like a smart-home hub admin page. It assumes every
device on your network is yours.

## What it must NOT be used for

- **Never expose it to the internet.** No port-forwarding, no reverse proxy to the
  outside, no "just while I'm on holiday". Anyone who reaches the API can control
  your lights and TVs, play arbitrary audio and speech in your house, upload files
  to the server, and replace the pages your screens display.
- **Never run it on a network with untrusted users** (shared flats with strangers,
  public/guest WiFi, offices). Anyone on the LAN has control.
- **Not a commercial/venue product.** It has no authentication tiers, no audit log,
  no rate limiting. Don't run it in a bar, escape room, or classroom without putting
  real access control in front of it yourself.
- **Remote access:** use a VPN (WireGuard, Tailscale) so your phone joins the home
  network. That is the only supported remote path.

## What protection exists

- An admin token (generated at first run) is required for mutating endpoints
  *(in progress — see ROADMAP; v0.10 has no auth at all, which is why the rules
  above are absolute)*.
- Secrets (`HA_TOKEN`, `MA_TOKEN`) live in environment variables, are never written
  to config files, and are never returned by any API.
- Path traversal is rejected on all file-serving and upload endpoints; uploads are
  extension-whitelisted; profile writes are guarded against accidental mass deletion.

## Reporting

Found a vulnerability? Open a GitHub security advisory or contact the maintainer
privately rather than filing a public issue.
