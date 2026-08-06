#!/bin/sh
# music-player.sh v1.1 (public) — run a squeezelite player pinned to ONE TV's HDMI
# sink, so Music Assistant can stream perfectly-synced music out of the TV speakers
# while the screen keeps showing Roomscape (no DLNA/AirPlay screen hijack).
#
# Config comes from /etc/default/immersion-music (written by install-music.sh):
#   FRAME     which TV this player sings through (e.g. L2)          REQUIRED
#   MA        Music Assistant server IP (slimproto)                 REQUIRED
#   CONDUCTOR Roomscape conductor URL (resolves FRAME -> sink)      REQUIRED
#   NAME      the player name shown in Music Assistant
#             (default "Roomscape <hostname> <frame>")
#
# Run by systemd unit immersion-music.service as the kiosk user.

[ -n "${FRAME:-}" ] || { echo "[music] FRAME is not set — configure /etc/default/immersion-music (see install-music.sh)"; exit 1; }
[ -n "${MA:-}" ] || { echo "[music] MA (Music Assistant server IP) is not set — configure /etc/default/immersion-music"; exit 1; }
[ -n "${CONDUCTOR:-}" ] || { echo "[music] CONDUCTOR url is not set — configure /etc/default/immersion-music"; exit 1; }
NAME="${NAME:-Roomscape $(hostname) $FRAME}"
NODE="$(command -v node 2>/dev/null || echo /snap/bin/node)"

# wait for the user's PipeWire/Pulse to be up (kiosk session starts it)
i=0; while [ "$i" -lt 30 ]; do pactl info >/dev/null 2>&1 && break; sleep 2; i=$((i + 1)); done

# resolve this frame's sink via the same helper the kiosks use
SINK=""
[ -x "$NODE" ] && [ -f "$HOME/immersion-edge/frame-sink.js" ] && \
  SINK=$("$NODE" "$HOME/immersion-edge/frame-sink.js" "$FRAME" "$CONDUCTOR" 2>/dev/null)
[ -n "$SINK" ] && export PULSE_SINK="$SINK"       # honoured by the pulse build
[ -n "$SINK" ] && export PIPEWIRE_NODE="$SINK"    # honoured by the ALSA build via pipewire-alsa
                                                   # (recent Ubuntu ships the ALSA build; without this it
                                                   #  autoconnects to the DEFAULT sink = the wrong TV)

# stable per-frame MAC so Music Assistant remembers each player
MAC=$(printf '%s-%s' "$(hostname)" "$FRAME" | md5sum | sed 's/^\(..\)\(..\)\(..\)\(..\)\(..\).*/02:\1:\2:\3:\4:\5/')

echo "[music] frame=$FRAME sink=${SINK:-default} name=$NAME ma=$MA mac=$MAC"
exec squeezelite -s "$MA" -n "$NAME" -m "$MAC"
