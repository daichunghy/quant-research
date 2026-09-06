# Release, update, and rollback

This runbook covers the current deterministic alpha. It does not authorize a
publish, a stable statistical package claim, an executed SEM analysis, or
external adoption.

## Before release

1. Freeze the source commit and package version.
2. From a clean checkout, run `npm ci`, `npm run verify`, and
   `npm pack --dry-run --json`. The verify command includes an offline
   clean-room consumer smoke that installs the package, imports it, starts the
   CLI, and runs a shipped example.
3. Confirm that `examples/reproducibility-manifest.json` pins every distributed
   JSON fixture and that the replay digests still match.
4. Run `npm run first-use` and retain the summary. It must show preserved rows,
   preserved raw columns, and `statisticalEngineExecuted: false`.
5. Recheck the registry with
   `npm view @agentbiz/quant-research dist-tags versions --json`. Source tags
   and registry tags may not be synchronized.
6. Only the package owner may publish or create a release. Record the exact
   version, tarball file list, manifest hash, replay output, and gate output.

## Consumer update

Use an exact version and replay the deterministic workflow:

```sh
npm install --save-exact @agentbiz/quant-research@<version>
npm run first-use
```

Keep the instrument, dataset, recode, and emitted specifications under the
consumer's own provenance rules. Demonstration items remain demonstrations;
the package does not estimate models or run SPSS, lavaan, AMOS, or SmartPLS.

## Rollback

1. Stop the update and record package version, input digest, artifact digest,
   emitted syntax version, and the redacted symptom.
2. Restore the last known-good exact package version or lockfile, then rerun
   the verification and first-use workflow:

   ```sh
   npm install --save-exact @agentbiz/quant-research@<known-good-version>
   npm run verify
   npm run first-use
   ```

3. Keep raw datasets and prior emitted artifacts unchanged. Recode operations
   must continue to add columns rather than overwrite source columns or drop
   rows.
4. Preserve faulty tags and release history. Do not force-push or silently
   repoint a published dist-tag. A replacement release requires owner approval.
5. Compare the known-good receipt and artifact digests before resuming work.

Rollback restores the deterministic contract version. It does not establish
ethical approval, statistical validity, engine execution, or adoption.
