#!/bin/sh
# install-audio.sh — give a Roomscape display PC a PipeWire audio server so the
# kiosks can output sound, and so each TV's kiosk can be pinned to that TV's own
# HDMI output (per-TV / spatial audio). Run on EACH display PC as the kiosk user:
#     sh install-audio.sh
#
# After this, deploy deploy/xinitrc + frame-sink.js and restart the kiosk. The
# frame->TV port map is set in the app (Settings -> "Audio — PC HDMI port map").
set -e

echo "── Installing PipeWire audio stack ─────────────────────────────"
sudo apt-get update
sudo apt-get install -y pipewire pipewire-pulse pipewire-alsa wireplumber \
                        libspa-0.2-modules pulseaudio-utils

# kiosk user needs the audio group (usually already added for the edge service)
sudo usermod -aG audio "$USER" 2>/dev/null || true

echo
echo "── Running PipeWire as a lingering user service ────────────────"
# enable-linger keeps the user's PipeWire up without an interactive login, so the
# kiosk (same user, started from getty autologin) can always reach the sinks.
loginctl enable-linger "$USER" 2>/dev/null || true
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
systemctl --user daemon-reload 2>/dev/null || true
systemctl --user enable --now pipewire.socket pipewire pipewire-pulse.socket pipewire-pulse wireplumber 2>/dev/null || true

sleep 2
echo
echo "── Check ───────────────────────────────────────────────────────"
if pactl info >/dev/null 2>&1; then
  echo "PipeWire is up. Sinks it can see right now:"
  pactl list sinks short || true
  echo
  echo "You want ONE sink per connected HDMI TV. If some are missing, the card"
  echo "profile may not expose every HDMI PCM — set the HDMI audio card to the"
  echo "'pro-audio' profile (deploy/xinitrc does this at session start):"
  echo "  pactl set-card-profile <card-name> pro-audio"
else
  echo "pactl can't reach PipeWire yet. Log out/in once (or reboot), then re-run"
  echo "  pactl info"
fi
echo
echo "Next: deploy deploy/xinitrc + frame-sink.js, then: sudo systemctl restart getty@tty1"
