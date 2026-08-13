# TLA documentation

This directory is the maintained entry point for product and engineering
knowledge. Documentation should describe current code; proposals and delivery
plans must be labelled clearly so they are not mistaken for shipped behavior.

## Start here

| Document | Purpose |
|---|---|
| [Product requirements](requirements/product.md) | Actors, product scope, acceptance criteria and requirement IDs. |
| [Architecture](architecture.md) | Runtime boundaries and source-code responsibilities. |
| [Technologies](technologies.md) | Main dependencies and why they are used. |
| [E2E testing](testing/e2e.md) | Running, debugging and extending Playwright tests. |
| [Tournament phases](tournament-phases.md) | Competition phase model and behavior. |

## Documentation conventions

- Update documentation in the same change as the behavior it describes.
- Give requirements stable IDs and observable acceptance criteria.
- Put time-bound designs and implementation plans under `docs/superpowers/`;
  keep current system documentation at the top level or in a topical folder.
- Prefer links to source files or tests over copying implementation details.
