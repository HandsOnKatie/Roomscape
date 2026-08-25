Overlays
========

Drop transparent PNGs (or SVG / WebP) in this folder. Each one becomes an
overlay you can layer over a frame's artwork.

Overlays are what make a TV read as something other than a TV: window mullions
over a landscape, a stone arch around a dungeon scene, a picture-frame mount
over a portrait, a porthole, a cracked pane.

How to use one
--------------
1. Put the file here.
2. In the app: Settings (gear) -> System -> "Rescan media".
3. Open Design, select a frame, and in the "Wall" lens pick your file from the
   "Overlay" button. An "Overlay fit" control appears once one is set.

Making them
-----------
- Transparent centre, opaque edges. The artwork shows through the hole.
- Portrait aspect, matching your screens (v1 is portrait-only).
- PNG with a real alpha channel is the reliable choice.

If your source art has a green background instead of transparency, there is a
global green-screen key under Settings -> Setup -> "Overlay green-screen",
with a tolerance slider. There is also a global drop-shadow option there,
which helps an overlay sit convincingly in front of the scene.

Notes
-----
- Only this README and a .gitkeep are committed. Your overlay files are never
  committed - they stay yours.
- Under Docker this folder is currently mounted read-only, which is fine for
  using overlays but means the app cannot write here. Add files from the host.
- Theme packs can ship their own overlays; those live inside the pack, not here.
