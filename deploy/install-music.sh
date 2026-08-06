#!/bin/sh -e
# install-music.sh v1.0 (public) — set up a Music Assistant player on this display PC.
#
# Run ON the display PC, from the folder holding music-player.sh + immersion-music.service:
#   scp install-music.sh music-player.sh immersion-music.service <pc>:~/
#   ssh <pc> 'sh install-music.sh <FRAME> <ma-server-ip> <conductor-url> ["Player name"]'
#
#   <FRAME>          which TV this player sings through (e.g. L2)
#   <ma-server-ip>   the Music Assistant server (slimproto host)
#   <conductor-url>  your Conductor, e.g. http://<server-ip>:8090
#                    (used to resolve FRAME -> that TV's audio sink)
#   [name]           player name shown in Music Assistant
#                    (default: "Roomscape <hostname> <FRAME>")
#
# What it does: installs squeezelite, kills the distro's default instance,
# installs music-player.sh + a systemd service that pins the player to the
# chosen TV's HDMI sink (resolved via frame-sink.js, like the kiosks do).

usage() {
  echo "Usage: sh install-music.sh <FRAME> <ma-server-ip> <conductor-url> [\"Player name\"]"
  echo "  e.g. sh install-music.sh L2 192.168.1.20 http://192.168.1.50:8090"
  exit 1
}

FRAME="${1:-}"; MA="${2:-}"; CONDUCTOR="${3:-}"
[ -n "$FRAME" ] && [ -n "$MA" ] && [ -n "$CONDUCTOR" ] || usage
case "$CONDUCTOR" in http://*|https://*) ;; *) echo "conductor-url must start with http://"; usage ;; esac

HN=$(hostname)
NAME="${4:-Roomscape $HN $FRAME}"

echo "== $HN: player '$NAME' through frame $FRAME (MA at $MA) =="

sudo apt-get install -y squeezelite-pulse || sudo apt-get install -y squeezelite
# the package auto-starts a default-config instance on the default sink — kill it
sudo systemctl disable --now squeezelite squeezelite-pulse 2>/dev/null || true

mkdir -p "$HOME/immersion-edge"
cp "$(dirname "$0")/music-player.sh" "$HOME/immersion-edge/music-player.sh"
chmod +x "$HOME/immersion-edge/music-player.sh"

printf 'FRAME=%s\nNAME=%s\nMA=%s\nCONDUCTOR=%s\n' "$FRAME" "$NAME" "$MA" "$CONDUCTOR" \
  | sudo tee /etc/default/immersion-music >/dev/null

sed -e "s|__USER__|$(id -un)|g" -e "s|__HOME__|$HOME|g" \
  "$(dirname "$0")/immersion-music.service" | sudo tee /etc/systemd/system/immersion-music.service >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now immersion-music
sleep 3
systemctl --no-pager --full status immersion-music | head -12 || true
echo "== done — '$NAME' should appear as a player in Music Assistant within ~30s =="
