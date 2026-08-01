# Review-queue pagination plan

**Goal:** Expose the full unreviewed check-in count and a reachable, deterministic page instead of silently truncating the queue.

**Design:** Build one visibility-scoped base query, count it, and fetch an oldest-first page with the repository's standard 20-row default and 100-row cap. The dashboard uses the total count and the first page's oldest item as its review entry point, so repeated review reaches the entire queue without a new screen.

## Tasks

1. Change context/controller/JSON tests to require `{count, submissions}` and offset pagination.
2. Implement the shared base query plus oldest-first total ordering.
3. Switch the OpenAPI response to `Shared.list_response/2` and regenerate both frontend schemas.
4. Update the CoachApp hook and dashboard to use query params and total count.
5. Run focused backend tests, backend precommit, CoachApp build/Biome, responsive browser checks, `just check-rm`, and `git diff --check`; commit this concern alone.
