<!--
Thanks for contributing. CONTRIBUTING.md is short and worth a read.
Delete any section that doesn't apply.
-->

## What this changes

<!-- One or two sentences. What did the room do before, what does it do now? -->

## Why

<!-- Link an issue if there is one, or describe the symptom you hit. -->

## How to check it

<!-- The steps a reviewer should take to see the change working. -->

---

## Checklist

- [ ] `node scripts/smoke.js` passes
- [ ] `node --check` is clean on every file I touched
- [ ] **Version bumped** on every surface the change touches — the file header,
      and if the change is user-visible: `package.json`, the conductor banner,
      `/api/health`, README, SECURITY.md, `docs/ARCHITECTURE.md`, and the
      matching smoke assertions. (This project versions everything; the smoke
      suite enforces it.)
- [ ] `CHANGELOG.md` has an entry
- [ ] No new npm dependency in the runtime path — and **nothing** new required
      in `conductor-lib/`, which is Node-builtins-only by rule
- [ ] No hard-coded frame ids, entity ids, IP addresses, hostnames or personal
      paths (the reference install is `L1 L2 L3 / R1 R2 R3` — don't assume it)
- [ ] Anything user-supplied that reaches HTML goes through `esc()` / `escA()`
- [ ] Docs updated if behaviour or a label changed

## If this touches security

- [ ] I've read the threat model in `SECURITY.md`
- [ ] I've said below whether this changes what is reachable without the admin token

<!--
If you found a vulnerability, please DON'T open a PR that describes it in
public. Report it privately first — see SECURITY.md.
-->
