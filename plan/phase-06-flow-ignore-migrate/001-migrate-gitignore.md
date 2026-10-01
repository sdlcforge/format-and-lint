# Migrate Gitignore To Single Flow Entry

## Purpose and scope

Wave 2 of wave plan flow-ignore-canonicalization (plan-group migrate-sdlcforge) for project format-and-lint: make `.gitignore` contain a single `.flow/` entry and untrack any tracked `.flow` content, as a single commit.

## Requirements

Current state from the inventory row for sdlcforge/format-and-lint: The inventory shows no flow-related `.gitignore` lines (gitignore column `-`, ignored? `no`) and no tracked .flow paths (0).


1. Work only inside the task worktree.
2. In `.gitignore`, remove every flow-related ignore line and comment block that the single entry supersedes (the lines listed above that are flow ignore rules or their comments) and add exactly one `.flow/` line preceded by the comment `# Flow per-machine runtime state; durable state lives in plan/ and flow/.`. Keep every unrelated line untouched. Create `.gitignore` if absent.
3. If the inventory lists tracked `.flow` paths (it lists none) or `git ls-files .flow` is non-empty in the worktree, run `git rm -r --cached .flow` (files stay on disk) and include the removals in the same commit.
4. Commit only `.gitignore` and the `.flow` untracking with message `chore: ignore .flow/ via a single canonical entry` (add a note that `.flow` was untracked via `git rm --cached` if applicable), following the project's normal commit conventions. Do not change any other file.

## Validation

- `git check-ignore -v .flow/x` reports a match on the `.gitignore` line `.flow/`.
- `git ls-files .flow` is empty.
- `git diff <base>..HEAD --stat` lists only `.gitignore` (and removed `.flow/*` paths); no other file changed.
- Any fast checks relevant to `.gitignore` (none expected) still pass.

## Assumptions

- The Flow release containing the `.flow/` enforcement (wave 1) is installed.
- The main checkout's uncommitted work is untouched because the task runs in an isolated worktree.
- At close-out, `worktree-merge.sh` into the working branch refuses a main checkout with tracked uncommitted modifications. The inventory shows the main checkout as dirty(2) (tracked uncommitted changes possible). At close-out, `worktree-merge.sh` into the working branch refuses a main checkout with tracked uncommitted modifications, so the owner may need to commit or stash first, or the submit_pr strategy should be used.

## References

- Wave plan: flow-ignore-canonicalization (wave-2-migration, plan-group migrate-sdlcforge), manifest in the lead project sdlcforge/flow.
- Inventory: /Users/zane/playground/.flow/flow-ignore-migration-inventory.md
