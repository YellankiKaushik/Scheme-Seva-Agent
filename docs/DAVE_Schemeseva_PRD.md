# SchemeSeva PRD Archive Notice

This file is retained as an archive pointer for an earlier planning draft.

The current implementation documentation is now maintained in:

- [README.md](../README.md)
- [TECHNICAL_DOCUMENTATION.md](../TECHNICAL_DOCUMENTATION.md)
- [JUDGES_GUIDE.md](../JUDGES_GUIDE.md)

Use those files as the source of truth for judging, mentoring, setup, and technical review.

## Current Implementation Snapshot

- SchemeSeva is a TypeScript-native civic AI agent for government scheme discovery.
- The current catalog contains 28 verified Central + Telangana schemes.
- The app uses a Mastra-style TypeScript workflow adapter around server functions.
- Qdrant supports scheme retrieval, citizen session memory, and pending alert memory.
- Enkrypt AI validates generated reports and Vigilance alerts when configured.
- The demo uses a browser session key and does not require production user accounts.
- The app does not collect Aadhaar numbers or bank account numbers.
- Reports are guidance only and must be confirmed on official portals.
- Supabase is optional fallback only and is not required for the demo.

The earlier planning assumptions in this file were superseded to avoid confusing future readers with implementation details that are no longer accurate.
