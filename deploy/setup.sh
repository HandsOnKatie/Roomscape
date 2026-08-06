#!/bin/bash
# ============================================================
#  Roomscape — display PC kiosk setup   v1.0 (public)
#
#  Turns a fresh Ubuntu Server install into a Roomscape kiosk:
#  installs X + a browser, deploys ~/.xinitrc (from deploy/xinitrc),
#  sets console auto-login + auto-startx, disables sleep, and adds
#  passwordless restart/reboot/poweroff for remote control.
#
#  Run ON the display PC, from the folder holding deploy/xinitrc:
#
#    sudo bash setup.sh "<frames>" <server-url>
#
#    <frames>      frame ids this PC shows, left to right, quoted
#                  e.g. "L1 L2 L3"  (left wall)  or  "R1 R2 R3"
#    <server-url>  your Conductor, e.g. http://<server-ip>:8090
#                  (if this PC runs the edge mirror, its localhost
#                   SERVER line is preserved on re-runs)
#
#  Example:
#    sudo bash setup.sh "L1 L2 L3" http://192.168.1.50:8090
#
#  Safe to re-run: every step is idempotent, and any existing
#  ~/.xinitrc gets a timestamped backup first.
# ============================================================
set -euo pipefail

usage() {
  echo "Usage: sudo bash setup.sh \"<frames>\" <server-url>"
  echo "  e.g. sudo bash setup.sh \"L1 L2 L3\" http://<server-ip>:8090"
  exit 1
}

FRAMES="${1:-}"; SERVER="${2:-}"
[ -n "$FRAMES" ] && [ -n "$SERVER" ] || usage
case "$SERVER" in http://*|https://*) ;; *) echo "server-url must start with http:// or https://"; usage ;; esac

KUSER="${SUDO_USER:-kiosk}"
KHOME="/home/$KUSER"

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -d "$KHOME" ] || { echo "No home dir $KHOME — run via sudo from the kiosk user, or create the user first."; exit 1; }

echo "==> Setting up '$KUSER' as kiosk for frames: $FRAMES"
echo "==> Conductor server: $SERVER"

echo "==> [1/6] Installing packages (this can take a few minutes)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  xorg xserver-xorg-video-all xinit x11-xserver-utils
snap list chromium >/dev/null 2>&1 || snap install chromium

echo "==> [2/6] Installing $KHOME/.xinitrc (from deploy/xinitrc) ..."
# deploy the MAINTAINED deploy/xinitrc verbatim, then fill in the config.
# It is looked for next to this script first, then /tmp/xinitrc (handy when
# you scp'd the two files separately).
SRC="$(cd "$(dirname "$0")" && pwd)"
XSRC=""
for CAND in "$SRC/xinitrc" /tmp/xinitrc; do
  [ -f "$CAND" ] && { XSRC="$CAND"; break; }
done
if [ -z "$XSRC" ]; then
  echo "ERROR: deploy/xinitrc not found (looked in $SRC and /tmp)."
  echo "Copy it next to this script (or to /tmp/xinitrc) and re-run:"
  echo "  scp deploy/xinitrc <pc>:/tmp/xinitrc"
  exit 1
fi
if [ -f "$KHOME/.xinitrc" ]; then
  cp -a "$KHOME/.xinitrc" "$KHOME/.xinitrc.backup.$(date +%Y-%m-%d-%H%M%S)"
fi
install -m 755 "$XSRC" "$KHOME/.xinitrc"
sed -i 's/\r$//' "$KHOME/.xinitrc"     # strip CRLF if a Windows editor touched it
# Fill in the server. A PC that already runs the local edge mirror keeps its
# localhost SERVER line untouched; fresh installs point at the Conductor given.
if [ ! -f "$KHOME/immersion-edge/edge.js" ]; then
  sed -i "s|^SERVER=\"[^\"]*\"|SERVER=\"$SERVER\"|" "$KHOME/.xinitrc"
else
  sed -i "s|^SERVER=\"__SERVER__\"|SERVER=\"http://localhost:8090\"|" "$KHOME/.xinitrc"
fi
# Fill in the frame list for this PC.
sed -i "s|^FRAMES=\"[^\"]*\"|FRAMES=\"$FRAMES\"|" "$KHOME/.xinitrc"
chown "$KUSER:$KUSER" "$KHOME/.xinitrc"
command -v google-chrome-stable >/dev/null 2>&1 || \
  echo "NOTE: Google Chrome not installed — kiosk will fall back to snap chromium (CPU video decode). Install Chrome (deb) for smooth 4K."

echo "==> [3/6] Auto-start X after console login..."
if ! grep -q "roomscape-kiosk-autostart" "$KHOME/.bash_profile" 2>/dev/null; then
  cat >> "$KHOME/.bash_profile" <<'PROFILE'
# roomscape-kiosk-autostart (added by setup.sh) — X only starts on the
# physical console; SSH logins are unaffected.
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  exec startx -- -nocursor >/dev/null 2>&1
fi
PROFILE
  chown "$KUSER:$KUSER" "$KHOME/.bash_profile"
fi

echo "==> [4/6] Auto-login on tty1..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<AUTOLOGIN
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KUSER --noclear %I \$TERM
AUTOLOGIN
systemctl daemon-reload

echo "==> [5/6] Passwordless remote-control commands + never sleep..."
cat > /etc/sudoers.d/kiosk <<SUDOERS
$KUSER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart getty@tty1, /usr/sbin/reboot, /usr/sbin/poweroff
SUDOERS
chmod 440 /etc/sudoers.d/kiosk
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 || true

echo "==> [6/6] Done."
echo
echo "   Frames:  $FRAMES"
echo "   Server:  $SERVER"
echo "   IP:      $(hostname -I | awk '{print $1}')"
echo
echo "Rebooting in 10 seconds — the TVs should come up showing the frames."
echo "(Ctrl-C now to cancel the reboot.)"
sleep 10
reboot
