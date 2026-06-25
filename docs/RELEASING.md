# Releasing

Both packages publish from one git tag via
[`.github/workflows/release.yml`](../.github/workflows/release.yml):

- **npm** — `@fedorello/airlock` (from `packages/ts`)
- **PyPI** — `airlock-hitl`, imported as `airlock` (from `packages/py`)

## One-time setup

### npm (token)

1. On npmjs.com, make sure the `fedorello` account/scope exists and you can
   publish to it.
2. Create an **automation** access token (Account → Access Tokens → Generate →
   _Automation_).
3. In the GitHub repo: Settings → Secrets and variables → Actions → New
   repository secret → name `NPM_TOKEN`, value the token.

### PyPI (Trusted Publishing — no secret)

1. On PyPI, go to your account → Publishing → **Add a pending publisher**.
2. Fill in:
   - PyPI Project Name: `airlock-hitl`
   - Owner: `fedorello`
   - Repository name: `airlock`
   - Workflow name: `release.yml`
   - Environment name: `pypi`
3. (A "pending" publisher lets the very first run create the project; after that
   it becomes a normal trusted publisher.)
4. In the GitHub repo, create an Environment named `pypi` (Settings →
   Environments → New environment). No secrets required — auth is via OIDC.

## Cutting a release

1. Bump the version in **both** packages, kept in sync:
   - `packages/ts/package.json` → `"version"`
   - `packages/py/pyproject.toml` → `version`
2. Update `CHANGELOG.md`.
3. Commit, then tag and push the tag:

   ```bash
   git commit -am "chore(release): v0.1.0"
   git tag v0.1.0
   git push origin main --tags
   ```

4. The `Release` workflow builds and publishes both packages. Watch it under the
   repo's Actions tab.

## Verifying

```bash
npm view @fedorello/airlock version
pip index versions airlock-hitl
```
