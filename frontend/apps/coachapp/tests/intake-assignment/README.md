# Missing-intake assignment

Run `pnpm test:intake-assignment` from coachapp with the isolated API on 44000, coachapp on 22022, and clientapp on 1314. The script creates its fixtures through `rtk proxy mix run --no-start fixtures.exs`; the fixture script explicitly selects `easy_coachapp_auth_dev` and disables automatic sweepers. Normal development services remain running.

Fixtures deliberately model pending clients without an intake. Normal invitation creation already assigns an intake, so these isolated records use the client changeset directly. Only fresh test businesses, clients and forms are mutated. Fixture records remain in the disposable database; generated fixture identities and screenshots are ignored by Git.

The real-API browser journey covers active Intake filtering, three pages, totals/search, cold and next-page failures, preview/reload/return, unavailable forms, inactive/existing clients, failed assignment and saved-result lookup, lost responses, concurrent assignment, focus and logout isolation at 375px and 1280px. A client accepts, fills and submits the intake in the real client app, then the coach reviews it. The client browser forwards `/v1/` requests to the isolated API without mocking the responses.
