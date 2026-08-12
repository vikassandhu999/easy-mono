# Define the coordinated schema and API cutover

Type: grilling
Status: open
Blocked by: 01, 02, 04, 05
Parent: [Coach workbench v1 delivery](../map.md)

## Question

What final schema, migration, context, endpoint, and OpenAPI changes support the accepted queue behavior as one prototype cutover?

Resolve field names and constraints for `joined_at`, the undated required-services set, and conversation waiting state. Resolve the Mark handled action, queue filter parameters, reason response shape, count/list consistency, indexes, and deletion of superseded predicates. No compatibility or data-backfill path is required.
