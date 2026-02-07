# Change Log

## Version 0.0.1-snapshot.5 - 2026-02-08

> Warning: This CLI tool is still work-in-progress

Add `uninstall` command to remove installed sources or selected skills, uninstalled selection will be tracked with `exclude` to avoid re-adding on update

Lazy-load trash to avoid require ESM issue

## Version 0.0.1-snapshot.4 - 2026-02-07

> Warning: This CLI tool is still work-in-progress

Add install alias `add` and rename `del` to `delete` with alias `del`

The `install` can select skills with patterns and preserves selection on update

Support root-level skill sources

Console warnings for invalid `SKILL.md` or name mismatches

## Version 0.0.1-snapshot.3 - 2026-02-06

> Warning: This CLI tool is still work-in-progress

Command `install` now disable skills only for known-but-unselected agents

Command `scan` now do not consider empty skill folder as valid skill

## Version 0.0.1-snapshot.2 - 2026-02-06

> Warning: This CLI tool is still work-in-progress

Implement commands `check`, `install`, `update`

Untangle the spaghetti logic of E2E tests

Update autoPublish workflow to fix publishing issues

## Version 0.0.1-snapshot.1 - 2026-02-05

> Warning: This CLI tool is still work-in-progress

Implement CLI for managing skills with commands `scan`, `init`, `del`, `enable`, `disable`, `config`, and `list`
