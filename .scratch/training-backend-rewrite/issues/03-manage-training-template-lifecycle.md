# 03 — Manage Training Template lifecycle

**What to build:** Let coaches inspect and manage Training Template metadata and archive lifecycle through the Programming interface and coach application.

**Blocked by:** 02 — Rebuild Training storage and create Training Templates.

**Status:** complete

- [x] A coach can inspect one Training Template with its canonical kind, revision, metadata, and empty or populated Prescription.
- [x] Metadata updates require an expected revision and return the incremented revision.
- [x] A coach can archive and restore a Training Template through explicit Programming behavior.
- [x] A coach can delete a Training Template without affecting independent Client Plans.
- [x] Inaccessible Training Templates return not found across business and coach visibility boundaries.
- [x] OpenAPI and generated coach types describe Template lifecycle requests, responses, and errors.
- [x] Coach detail and edit flows use Programming without child-resource orchestration.
- [x] Focused context, database, controller, and coach-interface tests pass.
