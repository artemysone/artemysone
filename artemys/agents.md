# Artemys Agent Guide

## Core Principle

Every line of code is a liability.

Write the least code that correctly solves the problem. Prefer deletion over addition, composition over abstraction, and built-in platform capabilities over new dependencies.

## What Good Looks Like

- Ship the smallest change that delivers the feature.
- Preserve clarity: simple code, obvious control flow, readable names.
- Follow best practices, but do not add ceremony that does not materially improve correctness, safety, or maintainability.
- Reuse existing patterns in the repo before introducing new ones.
- Keep V1 focused on the gallery product. Do not expand scope into future layers unless explicitly requested.

## Implementation Rules

- Start with the simplest possible design.
- Prefer existing Expo, React Native, Supabase, and TypeScript primitives before custom infrastructure.
- Add abstractions only after a real duplication or maintenance problem appears.
- Add dependencies only when they remove substantial complexity; otherwise, keep them out.
- Keep files small and responsibilities narrow, but do not split code just to create more structure.
- Use the existing design tokens and typography constants instead of hardcoding new values.
- Avoid speculative code, feature flags, and premature extensibility.
- Make errors explicit and handle the unhappy path.

## Quality Bar

- New code must be easy to explain in a few sentences.
- If a feature can be implemented in fewer lines without reducing readability or correctness, do that.
- Prefer stable, boring solutions over clever ones.
- Verify behavior with the lightest effective check available.
- Remove dead code, outdated comments, and unused branches when touching an area.

## Product and UX Constraints

- The product should feel warm, creative, and builder-first, not corporate.
- Keep crypto invisible in user-facing language.
- Show work over claims: demos, media, and proof matter more than extra interface chrome.

## Default Delivery Checklist

- Is this the smallest change that works?
- Did we reuse existing code and patterns?
- Did we avoid a new dependency or abstraction unless it was clearly justified?
- Is the code readable to the next engineer without extra explanation?
- Did we keep the feature inside current product scope?
