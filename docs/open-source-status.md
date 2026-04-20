# Open Source Status

This document is a lightweight tracking note for code and tooling that has already been split out of this repo, plus pieces that are plausible candidates for later extraction or publication.

It is intentionally brief for now and can be expanded later into a fuller pass.

## Already Separated

### Fluxel animation work

- The root README now links the separate repo for the sprite/image processing work:
  - `github.com/BBaysinger/fluxel-animations`
- This is the clearest current example of something that has already gone out of the main repo.

## Candidates For Future Extraction

### Internal deployment tooling

- The root README notes that the extensive internal deployment tooling in this monorepo will migrate to a separate repo over time.
- This includes scripts and CI/CD helpers that support deployment and operations rather than the portfolio application itself.

### Sprite renderer packages

- The sprite rendering system under `frontend/src/components/common/sprite-rendering/` already has package-shaping notes.
- Current candidate package split:
  - `sprite-player-core`
  - `react-sprite-player`
  - `search-param-utils`
- See `frontend/src/components/common/sprite-rendering/README.md` for the current extraction notes and cleanup checklist.

### Fluid responsive system

- `docs/fluid-responsive-system.md` describes the current implementation as the reference architecture for a future open-source version.
- The long-term shape described there is a standalone library with framework-agnostic core ideas and follow-on ecosystem support.

## Known Cleanup Before Publishing

### Sprite renderer

- Remove or replace app-local imports such as `@/utils/searchParams`.
- Split playback/controller logic away from the React wrapper.
- Decide package boundaries, exports, and styling strategy.

## Notes

- This is a status note, not a commitment list.
- Some items may end up as separate repos, some as published packages, and some may remain internal if the cleanup cost is not worth the result.
