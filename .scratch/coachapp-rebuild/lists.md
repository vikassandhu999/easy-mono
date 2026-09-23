# Server-owned lists

Clients and the training/nutrition libraries use server-owned filtering, counts and pagination. Follow opaque cursors unchanged. Counts describe the whole filtered result, independently of loaded pages. Every page reapplies tenant and visibility checks.

Retain loaded rows when the next page fails and offer Retry. Search and filter changes restart the sequence. A load-more sentinel calls the shared guarded fetch function, so an exhausted short list does not loop. Preserve filters and return position when visiting detail screens.

Verify literal search, equal-timestamp ordering, deleted anchors, invalid cursors, page bounds and tenant isolation. Browser checks cover empty, loading, retry and keyboard navigation at 375px and 1280px.
