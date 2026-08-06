#!/bin/bash
# ============================================================
#  Roomscape — screen (display output) setup   v1.0 (public)
#
#  Run ON the display PC (over SSH is fine) after the main setup.sh.
#
#  What it does:
#    1. Detects the TVs currently connected to this PC (xrandr).
#    2. Lets you put them in LEFT-TO-RIGHT order as they hang.
#    3. Rewrites the OUTPUTS / FRAMES / ROTATE lines in ~/.xinitrc
#       (a timestamped backup is made first).
#    4. Restarts the kiosk with the corner frame-id labels ON so you
#       can walk the wall and confirm the right frame is on the right TV.
#
#  Usage:  sudo bash configure-screens.sh <frame-prefix>
#     <frame-prefix> = the letter(s) your frame ids start with,
#                      e.g.  L  (frames L1 L2 L3)  or  R  (R1 R2 R3)
#
#  Safe to re-run as often as you like — it never touches cables,
#  only the software mapping.
# ============================================================
set -euo pipefail

PREFIX="${1:?Usage: sudo bash configure-screens.sh <frame-prefix>   e.g. L or R}"
[[ "$PREFIX" =~ ^[A-Za-z]+$ ]] || { echo "Frame prefix must be letters only (e.g. L or R)."; exit 1; }

KUSER="${SUDO_USER:-kiosk}"
KHOME="/home/$KUSER"
XINIT="$KHOME/.xinitrc"

[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo."; exit 1; }
[ -f "$XINIT" ] || { echo "No $XINIT found — run the main setup.sh first."; exit 1; }

# --- talk to the running kiosk X server as the kiosk user ---
xr() { sudo -u "$KUSER" env DISPLAY=:0 XAUTHORITY="$KHOME/.Xauthority" xrandr "$@"; }

echo "==> Detecting connected TVs..."
mapfile -t CONNECTED < <(xr 2>/dev/null | awk '/ connected/{print $1}')
N=${#CONNECTED[@]}

if [ "$N" -eq 0 ]; then
  echo
  echo "No displays detected. Check that:"
  echo "  - the TVs are powered on and on the correct HDMI input,"
  echo "  - the kiosk session is running (the PC has booted to the frames),"
  echo "  - the cables/adapters are seated."
  echo "Then run this again."
  exit 1
fi

echo
echo "Found $N connected output(s):"
i=1
for o in "${CONNECTED[@]}"; do
  geo=$(xr 2>/dev/null | grep -E "^$o connected" | grep -oE '[0-9]+x[0-9]+\+[0-9]+\+[0-9]+' | head -1)
  echo "   $i) $o   ${geo:+(currently $geo)}"
  i=$((i + 1))
done

echo
echo "Enter the outputs in LEFT-TO-RIGHT order, as the TVs hang on the wall,"
echo "by typing their numbers separated by spaces."
echo "  e.g.  2 1 3   (or just press Enter to accept the order above)"
read -r -p "Order: " ORDER

ORDERED=()
if [ -z "${ORDER// }" ]; then
  ORDERED=("${CONNECTED[@]}")
else
  for num in $ORDER; do
    if ! [[ "$num" =~ ^[0-9]+$ ]] || [ "$num" -lt 1 ] || [ "$num" -gt "$N" ]; then
      echo "Invalid entry '$num' — must be a number between 1 and $N. Aborting, nothing changed."
      exit 1
    fi
    ORDERED+=("${CONNECTED[$((num - 1))]}")
  done
fi

# --- rotation ---
CUR_ROTATE=$(grep -oP 'ROTATE="\K[^"]+' "$XINIT" 2>/dev/null || echo left)
echo
read -r -p "Portrait rotation — left or right [$CUR_ROTATE]: " ROT
ROT="${ROT:-$CUR_ROTATE}"
case "$ROT" in left|right) ;; *) echo "Rotation must be 'left' or 'right'. Aborting."; exit 1 ;; esac

# --- build the new config values ---
OUTPUTS="${ORDERED[*]}"
FRAMES=""
for k in $(seq 1 "${#ORDERED[@]}"); do FRAMES+="${PREFIX}${k} "; done
FRAMES="$(echo "$FRAMES" | xargs)"

echo
echo "About to set:"
echo "   OUTPUTS = \"$OUTPUTS\""
echo "   FRAMES  = \"$FRAMES\""
echo "   ROTATE  = \"$ROT\""
read -r -p "Apply this? [Y/n]: " OK
case "${OK:-Y}" in y|Y|"") ;; *) echo "Cancelled, nothing changed."; exit 0 ;; esac

# --- verify the lines we're about to manage actually exist ---
for KEY in OUTPUTS FRAMES ROTATE; do
  if ! grep -q "^$KEY=" "$XINIT"; then
    echo "ERROR: no '$KEY=' line found in $XINIT — the file isn't in the expected"
    echo "shape (hand-edited, or from a different xinitrc generation)."
    echo "Nothing was changed. Redeploy deploy/xinitrc first, then re-run."
    exit 1
  fi
done

# --- back up, then patch the three CONFIG lines ---
TS=$(date +%Y-%m-%d-%H%M%S)
cp -a "$XINIT" "$XINIT.backup.$TS"

sed -i \
  -e "s|^OUTPUTS=.*|OUTPUTS=\"$OUTPUTS\"|" \
  -e "s|^FRAMES=.*|FRAMES=\"$FRAMES\"|" \
  -e "s|^ROTATE=.*|ROTATE=\"$ROT\"|" \
  -e "s|label=0|label=1|g" \
  "$XINIT"

# --- trust but verify — confirm the values actually landed ---
ok=1
grep -qF "OUTPUTS=\"$OUTPUTS\"" "$XINIT" || ok=0
grep -qF "FRAMES=\"$FRAMES\""   "$XINIT" || ok=0
grep -qF "ROTATE=\"$ROT\""      "$XINIT" || ok=0
if [ "$ok" -ne 1 ]; then
  echo "ERROR: the edit did not apply cleanly — restoring the backup, nothing changed."
  cp -a "$XINIT.backup.$TS" "$XINIT"
  exit 1
fi

echo
echo "==> Updated $XINIT"
echo "    (backup saved: $XINIT.backup.$TS)"
echo "==> Restarting the kiosk so the change takes effect..."
systemctl restart getty@tty1

echo
echo "Done. Each TV will briefly show its frame id (e.g. ${PREFIX}1) in a corner."
echo "Walk the wall:"
echo "  - all TVs lit + ids in left-to-right order  ->  you're finished."
echo "  - an id on the wrong TV  ->  just re-run this and change the order."
