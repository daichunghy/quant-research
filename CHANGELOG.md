# Changelog

All notable changes are documented here, newest first. Entries mirror the tagged releases (dates UTC); the release page for each tag carries the same text plus its assets.

## [Unreleased]

- Added a deterministic TAM workflow descriptor and a second service-quality
  workflow covering instrument, topic card, coverage, audit, recode,
  measurement, and all supported emitters.
- Extended `npm run first-use` to verify the complete workflow and preserve
  rows/raw columns without executing a statistical engine.
- Added a named `--workflow service-quality` entrypoint mode with concise help
  and a truthful local summary for first-time command-line use.
- Added a deterministic `workflow-summary.md` beside the JSON summary, with
  step statuses, row/raw-column invariants, emitted filenames, and the explicit
  no-statistical-engine boundary.
- Added an offline clean-room consumer smoke that packs, installs, imports, and
  runs the CLI with a shipped example without contacting the registry.
- Added release/update/rollback guidance. This entry is not a published
  version and does not claim statistical validity or engine execution.

Release candidate: `0.1.0-alpha.6` is prepared locally. It is not published
until the owner completes npm authentication and the release gates pass.

## [v0.1.0-alpha.5](https://github.com/daichunghy/quant-research/releases/tag/v0.1.0-alpha.5) — 2026-08-23

Public alpha release of @agentbiz/quant-research.\n\nInstall:\n\n    npm install @agentbiz/quant-research@alpha\n\nThis release provides deterministic instrument, coverage, dataset, recode, measurement-spec, receipt, and emitter contracts. It does not estimate SEM, compute fit indices, write spreadsheets, call model providers, or claim adoption.

## [v0.1.0-alpha.4](https://github.com/daichunghy/quant-research/releases/tag/v0.1.0-alpha.4) — 2026-08-23

Current public source alpha. Package, tag, README, support page, examples, pack check, and main are synchronized at v0.1.0-alpha.4. The clean-clone verify path passes and the tarball now includes examples. npm registry publication remains pending OTP verification; external adoption is not claimed.

## [v0.1.0-alpha.3](https://github.com/daichunghy/quant-research/releases/tag/v0.1.0-alpha.3) — 2026-08-23

Current public source alpha. Package, tag, README, and main now share v0.1.0-alpha.3. Clean-clone npm ci and npm run verify pass. npm registry publication remains pending OTP verification; GitHub tag is the supported path. External adoption is not claimed.

## [v0.1.0-alpha.2](https://github.com/daichunghy/quant-research/releases/tag/v0.1.0-alpha.2) — 2026-08-23

Current public source alpha. The GitHub tag is verified by npm ci and npm run verify from a clean clone. The npm package is prepared but registry publication is pending npm OTP verification. The release claims only deterministic quantitative research contracts and emitters; it does not run SEM, write spreadsheets, or claim adoption.

## [v0.1.0-alpha.1](https://github.com/daichunghy/quant-research/releases/tag/v0.1.0-alpha.1) — 2026-08-23

Public alpha. Deterministic instrument, coverage, dataset, recode, measurement-spec, receipt, and SPSS/lavaan/AMOS/SmartPLS emitter contracts. This release does not run SEM, write spreadsheets, claim ethical approval, or claim adoption. Verify with npm run verify; external consumers are not yet recorded.
