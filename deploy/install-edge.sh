#!/bin/bash
# ============================================================
#  Roomscape — install the EDGE media mirror on a display PC
#  Run ON the display PC:
#      sudo bash install-edge.sh <upstream-conductor-url>
#  e.g.  sudo bash install-edge.sh http://<server-ip>:8090
#
#  What it does:
#    1. Installs Node (snap) if it isn't already present.
#    2. Copies edge.js + frame-sink.js to ~/immersion-edge/ and makes ~/framecache.
#    3. Installs + enables the immersion-edge systemd service (starts on boot,
#       restarts on crash, pre-warms the whole media library from the Conductor).
#  Safe to re-run (idempotent) — e.g. after editing edge.js.
# ============================================================
set -euo pipefail

UPSTREAM="${1:?Usage: sudo bash install-edge.sh <upstream-conductor-url>   e.g. http://<server-ip>:8090}"
case "$UPSTREAM" in http://*|https://*) ;; *) echo "Upstream must be a URL, e.g. http://<server-ip>:8090"; exit 1 ;; esac
KUSER="${SUDO_USER:-kiosk}"
KHOME="/home/$KUSER"
DEST="$KHOME/immersion-edge"
SRC="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
[ -f "$SRC/edge.js" ] || { echo "edge.js not found next to this script ($SRC)."; exit 1; }

# 1. Node
if ! command -v node >/dev/null 2>&1 && [ ! -x /snap/bin/node ]; then
  echo "==> Installing Node (snap)…"
  snap install node --classic
fi
NODE="$(command -v node 2>/dev/null || echo /snap/bin/node)"
echo "==> Using node at: $NODE"

# 2. app + cache dirs
install -d -o "$KUSER" -g "$KUSER" "$DEST"
install -o "$KUSER" -g "$KUSER" -m 0644 "$SRC/edge.js" "$DEST/edge.js"
[ -f "$SRC/frame-sink.js" ] && install -o "$KUSER" -g "$KUSER" -m 0644 "$SRC/frame-sink.js" "$DEST/frame-sink.js"
install -d -o "$KUSER" -g "$KUSER" "$KHOME/framecache"

# 3. systemd unit (fill the template placeholders)
sed -e "s|__USER__|$KUSER|g" \
    -e "s|__HOME__|$KHOME|g" \
    -e "s|__UPSTREAM__|$UPSTREAM|g" \
    -e "s|__NODE__|$NODE|g" \
    "$SRC/immersion-edge.service" > /etc/systemd/system/immersion-edge.service

systemctl daemon-reload
systemctl enable --now immersion-edge
sleep 2
echo
systemctl --no-pager --lines=0 status immersion-edge | head -6 || true
echo
echo "==> Edge mirror installed (upstream: $UPSTREAM)."
echo "    Check it:   curl -s http://localhost:8090/edge/status"
echo "    Logs:       journalctl -u immersion-edge -f"
echo
echo "Next: point the kiosk at the edge — make sure ~/.xinitrc has"
echo '      SERVER="http://localhost:8090"'
echo "      then:  sudo systemctl restart getty@tty1"
