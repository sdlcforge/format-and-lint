# Plan Summary: migrate-sdlcforge

## What was planned and why

Wave 2 (wave-2-migration) of wave plan flow-ignore-canonicalization, plan-group migrate-sdlcforge. This plan covers the single project format-and-lint and a single task: make `.gitignore` carry exactly one `.flow/` entry and untrack any tracked `.flow` content.

Flow now treats `.flow/` as fully git-ignored. This plan replaces any flow-related ignore lines in format-and-lint's `.gitignore` with the single `.flow/` entry and, where tracked `.flow` content exists, untracks it with `git rm -r --cached .flow` (files stay on disk). One task, one commit, no other files change.

## What shipped

### Phase 06 — Migrate Flow Ignore - format-and-lint

1. **Migrate Gitignore To Single Flow Entry** (`001-migrate-gitignore.md`, tier `sonnet-low`) — Added single .flow/ entry to .gitignore; nothing tracked under .flow.
   Commit `f6bb4c2`, merged at `83d2bd9`.

## Key decisions

_No `## Why this shape` section is recorded in `plan/overview.md`, so this plan's cross-task rationale was never written down. Per-task outcomes are under "What shipped" above._

## Findings

_No findings closed in this plan's `plan/findings.yaml`._

## Final Task State

# TODO

## Purpose and scope

Tracking document for the active plan.

## Tasks

### Phase 06 — Migrate Flow Ignore - format-and-lint

- [x] [001-migrate-gitignore.md](./phase-06-flow-ignore-migrate/001-migrate-gitignore.md) — tier `sonnet-low` · branch `plan/migrate-sdlcforge-06-001` · commit `f6bb4c2` · merge `83d2bd9`
