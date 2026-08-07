# Update Architecture Docs

## Purpose and scope

Review and update fandl's architecture and specification documentation so it reflects the
TypeScript and TSX support delivered in Phase 01.

The architectural implications check flagged this plan because it **modifies a public API and
component boundary**: `getEslintConfig`'s documented component-based configuration surface gains two
new components, the module-level extension vocabulary in `src/lib/default-config/js-extensions.mjs`
gains new exports, and the set of file extensions fandl processes by default changes for every
consumer.

Invoke the `update-architecture-docs` task-procedure at
`plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

## Requirements

role_doc: `plugins/flow/roles/architect-backend.md`

The implications are library API and component-boundary changes in a Node package — no data-model,
cloud/deployment, or frontend-architecture dimension — so the default backend architect role
applies.

### Implementation task documents that surfaced the architectural implications

These are the Phase 01 task documents whose changes drove this review. All will have been completed
by the time this phase runs:

- `plan/phase-01-typescript-support/001-add-typescript-extension-definitions.md` — changes the
  exported extension vocabulary and the default file-discovery surface.
- `plan/phase-01-typescript-support/002-add-typescript-eslint-configuration.md` — adds the `ts` and
  `tsJsdoc` components to the public component-based configuration API and changes the component
  ordering contract.
- `plan/phase-01-typescript-support/003-add-typescript-prettier-parser-selection.md` — changes the
  prettier stage from a single per-call parser to per-file parser selection, altering the documented
  reformatting pipeline.
- `plan/phase-01-typescript-support/005-update-typescript-documentation.md` — the consumer-facing
  documentation already written for the above; this review must not duplicate or contradict it.

### Architecture and specification files to review

**This repository has no `docs/` directory.** Verify that first: a `docs/*-spec.md` glob and a
`docs/architecture.md` check both come back empty at `/Users/zane/playground/sdlcforge/format-and-lint`.
`src/docs/` holds README source fragments, not architecture or specification documents.

fandl's architectural surface is documented in the generated `README.md`, sourced from:

- `src/docs/README.02.md` — the canonical description of the **component-based configuration**
  architecture and the **reformatting process** (prettier-then-ESLint pipeline). This is the
  architecture document in all but name and is the primary review target.
- `src/docs/README.01.md` — the usage and extension surface.
- `README.md` — generated; regenerate via `make README.md` rather than hand-editing.

Review these for architectural accuracy:

1. Does the component-based configuration description accurately state the current component set,
   what each component is scoped to, and the ordering that determines which component wins for a
   given file? Task 005 should have updated this; confirm rather than re-author.
2. Does the reformatting-process overview still describe the pipeline correctly now that the
   prettier stage selects its parser per file rather than once per call?
3. Are the forward-looking notes in `src/docs/README.02.md` ("the component structure is essentially
   a prototype at this point... Future versions will: break up 'base'... support arbitrary
   additional configuration components...") still accurate, or has adding `ts`/`tsJsdoc` changed the
   picture enough that the note should be revised?
4. Is `DEVELOPER_NOTES.md` (the maintainer-facing architectural-gotcha record, updated by task 005
   with the `eslint-config-standard-kit` finding) consistent with what shipped?

**Judge whether a dedicated `docs/architecture.md` is now warranted.** fandl has grown a genuine
multi-stage pipeline with a component-composition model, and README fragments are a thin place for
it. Do **not** create one unilaterally: if you judge it warranted, say so in your report as a
recommendation with a proposed outline, and leave the decision to the maintainer. Creating a new
top-level architecture document is a scope expansion beyond this plan.

### Constraints

- Do not hand-edit `README.md`; edit `src/docs/README.01.md` / `src/docs/README.02.md` and run
  `make README.md`.
- Do not duplicate task 005's consumer-facing content. If a needed update is already present and
  correct, record that as a verified check, not a rewrite.
- Do not modify any production source under `src/lib/` or `src/cli/`.
- Do not bump the package version.

## Validation

- Confirm and record the absence check: no `docs/` directory, no `docs/architecture.md`, no
  `docs/*-spec.md` in the repository.
- Each of the four review questions above is answered explicitly in the task report — either
  "verified accurate, no change needed" with the specific text checked, or a description of the
  change made.
- If `src/docs/README.01.md` or `src/docs/README.02.md` changed, `make README.md` regenerated
  cleanly and `git diff README.md` shows only the intended changes plus no churn in the
  JSDoc-generated middle section.
- The documented component list and ordering match `getEslintConfig` in
  `src/lib/default-config/eslint-config.mjs` exactly.
- The documented extension list matches `allExts` in `src/lib/default-config/js-extensions.mjs`
  exactly.
- `make test` and `make lint` still pass.
- `git diff --stat` touches only documentation files (`src/docs/*.md`, `README.md`,
  `DEVELOPER_NOTES.md`).

## Assumptions

- All five Phase 01 tasks have landed and merged.
- Task 005 already made the consumer-facing documentation updates; this task is a conformance review
  on top of them, not the first pass.

## References

- [Project Plan Document Standards](flow-mcp:d) — governs this plan's documents.
- `plugins/flow/task-procedures/update-architecture-docs/SKILL.md` — the procedure to invoke.
- `plugins/flow/roles/architect-backend.md` — the role doc for this task.
- [`eslint-config-standard-kit` and its `typescript: true` flag](../notes/standard-kit-typescript-flag.md)
  — a structural finding about the ESLint configuration layer that bears on any architecture
  write-up of the rule-composition model.
