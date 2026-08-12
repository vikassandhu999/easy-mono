# Design the Programming queue interaction

Type: prototype
Status: resolved
Blocked by: 01, 02
Parent: [Coach workbench v1 delivery](../map.md)

## Question

How should the Programming queue present All, Training, and Nutrition filters; service-specific reasons; never-programmed priority; lapsed coverage; and upcoming coverage gaps?

Produce a rough desktop and mobile interaction using the reason contract and required-service model. Decide the row information, filter counts, default selection, and the action that takes the coach into the correct planning workflow.

## Prototype

* [Programming queue interaction prototype](../../../frontend/apps/coachapp-v2/src/clients/prototypes/programming-queue-prototype.tsx)
* Development route: `http://localhost:2021/clients?view=programming&variant=A`
* Use the floating arrows or Left/Right keys to compare A — Priority list, B — Client task cards, and C — Focus pane. The All, Training, and Nutrition controls exercise overlapping service counts and filtered reason sets.

## Answer

Use **A — Priority list**.

* Default to **All**. Keep **All**, **Training**, and **Nutrition** as a single-select filter row with each distinct-client count visible. Training and Nutrition counts may overlap; All does not double-count a client.
* Render one row per client. Group rows by their first reason after filtering: **Never programmed**, **Coverage lapsed**, then **Ending soon**. Within the last two groups, order by `first_uncovered_on` ascending, followed by the stable client tie-break from the API.
* Filtering changes both membership and the visible reason set. A service-filtered row contains only that service's reasons and is regrouped according to its first remaining reason.
* Show the client's avatar and name, the primary reason's service icon and absolute coverage fact, and its reason label. Keep the copy factual: for example, “No training plan has ever been assigned,” “Nutrition uncovered since 11 Aug,” or “Training ends today · uncovered 14 Aug.”
* Give every affected service its own inline action: **Plan Training** or **Plan Nutrition**. A client who needs both services stays one row and gets both actions in strict reason order.
* The action opens that client's matching Training or Nutrition tab with the Assign plan flow open. Preserve this as an explicit navigation state during implementation, represented by the prototype as `?tab=<service>&assign=plan`.
* On mobile, keep the same hierarchy and groups; stack the service actions beneath the row facts rather than hiding information or changing the sort.
