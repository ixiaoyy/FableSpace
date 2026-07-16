# Execution Plan

- [x] Generate and review the complete project-image migrate/delete inventory and the 358-object media manifest.
- [x] Add frontend and backend media URL helpers plus configuration examples.
- [x] Replace active image imports, public path literals, dynamic compatibility paths, and maintained asset metadata.
- [x] Apply identity tags, fantasy filter grouping, and locked-card overlay changes.
- [x] Remove backend offline inputs, offline mode, obsolete demonstration naming, and obsolete configuration/docs.
- [x] Update deployment workflow to upload `media/v1` from the migration manifest and verify CDN delivery.
- [x] Update `AGENTS.md`, `README.md`, `docs/DEPLOYMENT.md`, `docs/IMAGE_ASSETS_SPEC.md`, and public asset guidance for URL-only media.
- [x] Run Python compile, frontend typecheck, frontend build with production media base, repository image-reference scan, and obsolete-name scan.
- [x] Commit and push the migration stage so GitHub Actions performs the authorized bucket upload.
- [x] Verify all 358 workflow/CDN objects, then delete migrated image binaries and the temporary repository-upload step.
- [x] Re-run the full minimal verification and prepare the URL-only final state for commit and push.

## High-risk review gates

- Do not delete a `migrate` source until its exact manifest URL returns HTTP 200 with the expected content type and either the expected binary byte length or text-equivalent SVG normalization; the bucket object size must always match the manifest.
- Do not rewrite `/generated/` private paths to the public CDN.
- Preserve legacy persisted asset-path compatibility through the URL normalizer.
- Verify identity catalog selectable state is unchanged: only `beggar` remains selectable.

## Validation

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
$env:VITE_MEDIA_BASE_URL = "https://img.pingxingxian.space/fablespace/media/v1"
npm --prefix .\apps\web run build
Remove-Item Env:VITE_MEDIA_BASE_URL
git ls-files | Where-Object { $_ -match '(?i)\.(png|jpe?g|webp|gif|svg|ico|avif|bmp|tiff?)$' }
$term = 'de' + 'mo'
rg -n -S -i -g '!.git/**' -g '!apps/web/node_modules/**' -g '!apps/web/build/**' $term .
```
