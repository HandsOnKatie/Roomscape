# Connecting Home Assistant

**Doc version 1.05** · Home Assistant is RoomScape's baseline integration. TV power, lighting, weather, sun times and NFC triggers all route through it.

RoomScape runs without Home Assistant — modes, scenes, sound, timers, scores and games all work. But you lose lighting and TV control, which is most of the magic. If you're going to set one thing up beyond the Conductor itself, set up this.

**What you get once it's connected:**

- Launching a mode **wakes the TVs and sets the lighting scene** automatically
- Restoring the at-rest mode puts TVs back to art/sleep and lights back to default
- Per-TV wake / sleep / input control from the app
- A **💡 Lights** tab with every one of your scenes
- Real weather on the windows, and a schedule that can follow sunset
- NFC tags that transform the room when tapped

---

## 1. Get a long-lived access token

In Home Assistant:

1. Click your **user avatar** (bottom-left of the sidebar)
2. Go to the **Security** tab
3. Scroll to **Long-lived access tokens** → **Create token**
4. Name it `roomscape`
5. **Copy it immediately** — Home Assistant shows it exactly once

<!-- SCREENSHOT: the HA long-lived access tokens section -->

## 2. Give it to the Conductor

Secrets live in `.env` at the repo root, and **only** there — never in a JSON config file, never in the compose file.

```dotenv
HA_URL=http://homeassistant.local:8123
HA_TOKEN=<the token you just created>
```

If `homeassistant.local` doesn't resolve on your network, use the IP: `http://192.168.1.50:8123`.

Then restart the Conductor:

```bash
docker restart roomscape
```

**Verify it worked** — either check `http://<server-ip>:8090/api/health` and look for `"ha": true`, or open the app and go to **⚙ Settings → 🛠 System**, where the status line should read *"Home Assistant: connected"*.

> The token stays inside the container's environment. Browsers never see it. The Conductor only ever proxies `media_player`, `light`, `scene`, `remote` and `switch` service calls — it can't use your token for anything else.

## 3. Get your TVs into Home Assistant

Each TV needs to exist in Home Assistant as a `media_player` entity before RoomScape can control it.

- **Samsung Frame TVs** arrive via the **SmartThings** integration.
- Other brands come via their own integrations.

Optionally, rename the entity ids to match your frame ids — `media_player.wall_l1` and so on. Not required, but it makes everything downstream obvious.

## 4. Map each frame to its TV

**Do this in the app, not in a file.** The setup wizard's step 3 exists precisely for this:

**⚙ Settings → 🛠 System → 🚀 Setup wizard → step 3 "Which TV is which?"**

You get one row per frame, a dropdown of every media player Home Assistant knows about, and a **🔦 Identify** button that flashes that frame's id on its TV — so you can walk the wall and match them up without guessing.

<!-- SCREENSHOT: wizard step 3, the frame → media player mapping rows -->

Map only the frames you actually have. A two-TV setup maps two entries.

<details>
<summary>Editing the mapping by hand (advanced)</summary>

The mapping lives in the settings block of the Conductor's profiles store.

- **Under Docker** that file is **`data/profiles.json`**. The `profiles.json` in the repo root is a sample and is *never read* — the Conductor writes its own from built-in defaults on first boot.
- **On bare Node** it is the repo-root `profiles.json`, unless you set `PROFILES_FILE`.

```json
"ha": {
  "tvs": {
    "L1": "media_player.wall_l1",
    "L2": "media_player.wall_l2",
    "L3": "media_player.wall_l3"
  },
  "lights": ["light.dining_ceiling", "light.dining_lamp"]
}
```

**`lights` is a separate key from `lightZones`, and the wizard never writes it.** Wizard step 4 fills `ha.lightZones` (the named `main` / `accent` zones the Lighting lens uses). The flat `ha.lights` array above is what the Lights tab's scene cards, Moments light flashes, intro light cues and werewolf night lighting all read — and if it's empty, `POST /api/ha/lightscene` answers *"no lights configured"* and nothing happens. Set it by hand.

Stop the Conductor before editing, and restart it afterwards. Doing it through the app is safer — it validates, backs up and reloads for you.
</details>

## 5. Samsung Frame TV notes

The Frame is the reference hardware, so a few specifics:

**`turn_off` drops the TV to Art Mode, not standby.** That's exactly the "sleep" you want — the room stays tasteful when RoomScape is at rest, showing artwork rather than a black rectangle. True standby needs a long-press on the physical remote; don't try to automate it.

Other things worth knowing:

- **SmartThings is cloud-routed.** Expect 1–3 seconds of lag on commands. Fine for scene changes, not for anything you want to feel instant.
- **The input dropdown** on each TV card lists whatever the integration reports as `source_list`. If you renamed an input on the TV to "PC" (which you should — see [INSTALL.md](INSTALL.md#4d-tv-settings)), that's the name you'll see.
- **The mode automation is signature-guarded** — it only fires when the mode or lighting actually changes, so it won't spam your Home Assistant with repeated calls.

## 6. NFC tags → modes

Stick an NFC tag on a board game box. Tap it with a phone. The room becomes that game's mode.

Tapping a tag fires a Home Assistant tag event; you forward it to RoomScape's API.

> **The `x-rs-token` header is required.** Since v1.01 the tag route is gated like every other change (`auth.tagOpen` defaults to `false`), so your `rest_command` must carry the admin token — the same one printed in the boot log and stored in `data/admin-token`.
>
> Keep it in `secrets.yaml`, not in `configuration.yaml`.

```yaml
# secrets.yaml
roomscape_token: "<the admin token>"
```

```yaml
# configuration.yaml
rest_command:
  roomscape_tag:
    url: "http://<server-ip>:8090/api/tag/{{ tag }}"
    method: POST
    headers:
      x-rs-token: !secret roomscape_token

  roomscape_restore:
    url: "http://<server-ip>:8090/api/panic"
    method: POST
    headers:
      x-rs-token: !secret roomscape_token

automation:
  - alias: "RoomScape — NFC tag tapped"
    trigger:
      - platform: tag
        tag_id: "04:A2:EXAMPLE"       # any tag id HA reports
    action:
      - service: rest_command.roomscape_tag
        data: { tag: "04:A2:EXAMPLE" }
```

The **tag → mode map itself lives in RoomScape**, edited under **⚙ Settings → 🔧 Setup → NFC tags**. So one generic `rest_command` covers every tag you'll ever add — you never touch Home Assistant again.

<details>
<summary>If your automation platform genuinely can't send a header</summary>

You can re-open the route with `config.json` → `"auth": { "tagOpen": true }`.

Understand what that means: **anyone who can reach the Conductor on your LAN can launch any tagged mode without the token.** It's the documented opt-out, not the default. Prefer the header.
</details>

## 7. Optional: MQTT bridge

For Home Assistant to *mirror* room state rather than only command it:

```dotenv
MQTT_URL=mqtt://homeassistant.local:1883
MQTT_PREFIX=immersion
```

The Conductor publishes retained state to `<prefix>/state`.

It also **accepts commands** on these topics: `game/start`, `game/phase`, `room/mode`, `room/panic`.

> ### ⚠️ Two things to know about the MQTT bridge
>
> **1. It bypasses the admin token entirely.** The token gate is an HTTP-layer control and never sees MQTT messages. Anyone who can publish to your broker can take control of the room. If you enable this, broker access is equivalent to holding the admin token — secure it accordingly.
>
> **2. `MQTT_PREFIX` currently applies only to published state, not to the command topics** — those are subscribed unprefixed. If you run two RoomScape installs against one broker, they will command each other regardless of prefix. Use separate brokers or separate credentials until this is fixed.

## Verify checklist

- [ ] `/api/health` reports `"ha": true`
- [ ] ⚙ Settings → 🛠 System says *"Home Assistant: connected"*
- [ ] The **💡 Lights** tab shows your real scenes, not the "not connected" message
- [ ] **🖼 Wake TVs** in the Play room row actually wakes them
- [ ] Launching a mode wakes the TVs **and** changes the lights
- [ ] **■ RESTORE ROOM** puts the lights back and the TVs to art/sleep
- [ ] *(if configured)* Tapping an NFC tag launches its mode

## If it isn't working

| Symptom | Likely cause |
|---|---|
| `"ha": false` in health | `HA_URL` or `HA_TOKEN` wrong, or the Conductor wasn't restarted after editing `.env` |
| Connected, but no entities listed | The token was created by a user without access to those entities |
| Frame says "no TV mapped" | That frame hasn't been mapped in wizard step 3 |
| Light scene cards do nothing / *"no lights configured"* | `ha.lights` is empty. The wizard only fills `ha.lightZones` — add the flat `lights` array by hand (see §4) |
| Commands lag 1–3 s | Normal for SmartThings; it's cloud-routed |
| `🕯 Chandelier` / `🛋 Console lamps` chips toast *"Zone unavailable"* | Those two zone ids are hard-coded from the original install and don't exist on your setup. The cards render, the chips just fail. Known rough edge — the scene grid and the per-mode Lighting lens work normally. |

More in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
