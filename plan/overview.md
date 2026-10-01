# Migrate format-and-lint to a single .flow/ ignore entry

## Purpose and scope

Wave 2 (wave-2-migration) of wave plan flow-ignore-canonicalization, plan-group migrate-sdlcforge. This plan covers the single project format-and-lint and a single task: make `.gitignore` carry exactly one `.flow/` entry and untrack any tracked `.flow` content.

## Overview

Flow now treats `.flow/` as fully git-ignored. This plan replaces any flow-related ignore lines in format-and-lint's `.gitignore` with the single `.flow/` entry and, where tracked `.flow` content exists, untracks it with `git rm -r --cached .flow` (files stay on disk). One task, one commit, no other files change.

## Phases

| # | Phase | Task | Tier |
|---|-------|------|------|
| 6 | flow-ignore-migrate | migrate-gitignore | sonnet-low |

## Risks

The inventory shows the main checkout as dirty(2) (tracked uncommitted changes possible). At close-out, `worktree-merge.sh` into the working branch refuses a main checkout with tracked uncommitted modifications, so the owner may need to commit or stash first, or the submit_pr strategy should be used.
