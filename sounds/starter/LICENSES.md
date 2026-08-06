# Starter sounds — licensing

Every `.wav` in this folder was **synthesized from scratch** for Roomscape with a
small Python script (`wave`/`struct`/`math` — pure sine/noise synthesis, 44.1 kHz
16-bit mono). No samples, recordings, or third-party material of any kind were
used, so there is nothing to attribute.

**License: CC0 1.0 Universal (public domain dedication).** Use them for anything,
no credit needed.

| File | What it is |
|---|---|
| `chime_soft.wav` | Two-note sine bell (A5 → D6) with a gentle decay |
| `boom_low.wav` | Low sine burst sweeping ~130 → 45 Hz, fast decay |
| `whoosh.wav` | Filtered-noise sweep (lowpass follows the swell) |
| `tick.wav` | 5 ms click |
| `fanfare_synth.wav` | Rising triad arpeggio (C5-E5-G5-C6) with a held chord |
| `alarm_gentle.wav` | Soft two-tone repeat (E5/A5) |

These are **functional placeholders** — good enough to make the 🎬 Intro
templates and Moments work out of the box. Replace them with better sounds
whenever you like: drop your own files into `sounds/` (any subfolder) and pick
them in the app's sound picker. Only `sounds/starter/` is tracked by git; the
rest of `sounds/` stays yours and local.
