# Agent instructions

## Commits

If a commit changes user-visible behaviour (a fix, feature, or behaviour change a user would notice), add a `Changelog:` line to the end of the commit message (e.g. with the other trailers), describing the impact for users in one line. Omit it for internal changes (refactors, tests, CI, dependency bumps).

```
Validate --settings-json with zod

...

Changelog: `--settings-json` is now validated; invalid input is logged and ignored instead of being written to the config
```

When preparing a release, run `yarn release-notes` to collect these since the last tag, and use them to write `versions/<version>.md` (shown in the app's What's New dialog) and the GitHub release notes.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`dindom999/lossless-cut`), driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

single-context (`GLOSSARY.md` + `docs/adr/` at the repo root). See `docs/agents/domain.md`.
