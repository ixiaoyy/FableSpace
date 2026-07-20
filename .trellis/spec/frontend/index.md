# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains the mandatory implementation and product-interface
contracts for the React Router frontend in `apps/web/`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |
| [User-Facing UI Copy](./ui-copy-guidelines.md) | Mandatory no-explanatory-copy and collection-structure contract | Active |

---

## Pre-Development Checklist

Before changing any user-facing page or component:

1. Read [User-Facing UI Copy](./ui-copy-guidelines.md).
2. Read [Quality Guidelines](./quality-guidelines.md).
3. Confirm the page structure is driven by its durable product role, not by the
   current number of records.
4. Plan a mobile-first viewport check for visual or interaction changes.

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.
