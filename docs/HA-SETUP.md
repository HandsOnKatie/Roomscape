# Home Assistant Setup

**Doc version 0.10** · Home Assistant is Roomscape's baseline integration: TV power, lighting scenes, and NFC triggers all route through it.

What you get once connected: a **Room** tab in the control app (TV power / art-sleep / volume / input per TV, plus lights), and **automatic room transformation** — launching a mode wakes the TVs and sets that mode's light scene; restoring the at-rest mode puts TVs back to art/sleep and lights back to your default.

## 1. Create a long-lived access token

In HA: click your user avatar (bottom-left) → **Security** tab → **Long-lived access tokens** → **Create token**. Name it `roomscape` and copy it immediately — it's shown once.

## 2. Give it to the Conductor

Secrets live only in `.env` (see `.env.example` at the repo root) — never in JSON config or compose files:

```dotenv
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<the token you just created>
```

Then `docker compose up -d` (or restart the container). Verify: `http://<server-ip>:8090/api/health` should report `"ha": true`.

The token stays in the container environment; browsers never see it. The Conductor proxies only `media_player` / `light` / `scene` / `remote` / `switch` service calls.

## 3. Get your TVs into HA and map them

1. Add each TV to HA (Samsung Frames arrive via the **SmartThings** integration; other brands via their own integrations). Each TV gets a `media_player.*` entity.
2. Optionally rename the entity ids to match your frame ids — tidy ids make the mapping obvious, e.g. `media_player.wall_l1`.
3. Map frame ids to entities in the settings block (`profiles.json` → `settings` → `ha`):

```json
"ha": {
  "tvs": {
    "L1": "media_player.wall_l1", "L2": "media_player.wall_l2", "L3": "media_player.wall_l3",
    "R1": "media_player.wall_r1", "R2": "media_player.wall_r2", "R3": "media_player.wall_r3"
  },
  "lights": ["light.example_ceiling"]
}
```

Map only the frames you actually have — a two-TV setup maps two entries.

## 4. Samsung Frame art-mode note

On a Frame TV, `turn_off` drops the TV to **Art Mode**, not standby — which is exactly the "sleep" you want (the room stays tasteful when Roomscape rests). True standby needs a long-press on the physical remote; don't try to automate that.

Other quirks worth knowing:

- SmartThings is cloud-routed: expect 1–3 s lag on commands. Fine for scene changes.
- The input dropdown on each TV card lists what the integration reports (`source_list`); renaming an input on the TV (e.g. to "PC") shows up there.
- The mode automation only fires on actual mode/light changes (signature-guarded), so it won't spam HA.

## 5. NFC tags → modes

Tapping an NFC tag on a phone fires an HA tag event; forward it to the Conductor's REST API:

```yaml
# configuration.yaml
rest_command:
  roomscape_tag:
    url: "http://<server-ip>:8090/api/tag/{{ tag }}"
    method: POST
  roomscape_restore:
    url: "http://<server-ip>:8090/api/panic"
    method: POST

automation:
  - alias: "Roomscape — NFC tag tapped"
    trigger:
      - platform: tag
        tag_id: "04:A2:EXAMPLE"       # any tag id HA reports
    action:
      - service: rest_command.roomscape_tag
        data: { tag: "04:A2:EXAMPLE" }
```

The tag→mode map itself is edited in the app (or in `profiles.json`), so one generic `rest_command` covers every tag: stick a tag on a game box, map it to that game's mode, and a tap transforms the room.

## 6. Optional: MQTT bridge (two-way)

For HA to *mirror* room state (not just command it), enable the MQTT bridge in `.env`:

```dotenv
MQTT_URL=mqtt://homeassistant.local:1883
MQTT_PREFIX=roomscape
```

The Conductor publishes retained state to `<prefix>/state` and accepts `game/start`, `game/phase`, and `room/panic` topics.

## Verify checklist

1. `/api/health` shows `"ha": true`.
2. Room tab shows your TV cards with live state; buttons work.
3. Launch a mode → TVs wake + lights change; restore → lights back, TVs to art/sleep.
4. NFC tap (if configured) → the mapped mode launches.
