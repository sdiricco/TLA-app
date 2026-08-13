# Requirements

This document is the entry point for product requirements. The first traceable
baseline lives in [Product requirements](requirements/product.md).

Requirements use stable identifiers so that implementation work, tests and
future decision records can refer to them without relying on section names.

## Status values

| Status | Meaning |
|---|---|
| Implemented | The current application contains the capability; coverage may still grow. |
| Partial | A usable slice exists, but one or more acceptance criteria are missing. |
| Planned | The requirement is agreed as direction but not implemented yet. |

When behavior changes, update the requirement and its acceptance criteria in
the same pull request. A requirement is not considered verified until it has a
manual check or an automated test linked from its `Verification` field.
