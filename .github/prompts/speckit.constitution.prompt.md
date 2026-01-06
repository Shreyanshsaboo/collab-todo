---
agent: speckit.constitution
---
# Project Constitution

## Purpose
Build a collaborative to-do application that allows multiple users to view and edit
the same task list using a shareable link, without requiring authentication.

## Core Principles
- Link-based collaboration over user accounts
- Backend-driven shared state
- Clear separation of concerns (UI, API, data)
- Explicit specifications before implementation
- Simplicity first, extensibility later

## Development Guidelines
- Use TypeScript across frontend and backend
- Follow Next.js App Router conventions
- Prefer RESTful APIs with predictable behavior
- Keep business logic out of UI components
- Use MongoDB ObjectIds as primary identifiers

## Scope Constraints
- No user authentication
- No roles beyond link-based permissions
- No real-time WebSockets in v1 (polling or refresh-based sync is acceptable)

## Evolution Policy
- The architecture must allow future addition of:
  - user accounts
  - permissions
  - real-time collaboration