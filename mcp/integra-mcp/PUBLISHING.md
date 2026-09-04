# Publishing `@integra/mcp`

The connector customers install to reach the API from Claude. Publishing it is
what lets `dashboard/app/api-keys/ConnectClaude.tsx` say `npx -y @integra/mcp`
instead of asking people to clone the whole repository.

## What gets published

`package.json` declares `files: ["dist", "README.md"]`, so the tarball is the
built output and nothing else:

```
20 files, 9.2 kB packed / 29.3 kB unpacked
  dist/*.js  dist/*.d.ts  README.md  package.json
```

No `src/`, no backend, no repository. Verify before every publish:

```bash
npm pack --dry-run
```

If that listing ever shows a file you would not hand a customer, stop.

## Publish

```bash
cd mcp/integra-mcp
npm login                 # once, as the account that owns the scope
npm publish               # prepublishOnly runs the build
```

`publishConfig.access` is `public`. Without it npm treats a scoped package as
private and fails with a billing error rather than a permissions one, which is
a confusing way to discover the problem.

## The scope

`@integra` currently has **zero** published packages, but an unclaimed *scope*
still requires an npm organisation of that name, and org availability cannot be
checked without authenticating. If `npm publish` reports the scope is taken or
you are not a member:

1. Create the org at <https://www.npmjs.com/org/create> — free for public
   packages; or
2. Fall back to `@integra-markets/mcp`, which matches the SDK's existing
   `@integra-markets/sdk` scope and keeps one namespace for everything.

Renaming means three files: this `package.json`, `README.md`, and
`ConnectClaude.tsx`.

## Order of operations

`ConnectClaude.tsx` now tells customers to run `npx -y @integra/mcp`. **Publish
first.** Until the package resolves that command fails for every reader — which
is the failure the git-clone stopgap existed to avoid.

1. `npm publish`
2. `npx -y @integra/mcp` from a clean directory, confirm it starts
3. Merge / deploy the dashboard

## Versioning

`bin` names are a public contract once anyone has a config referencing them —
`integra-mcp` and `integra-mcp-http` may be added to but not renamed. Same for
tool names in `dist/tools/`: a customer's saved prompts call them.
