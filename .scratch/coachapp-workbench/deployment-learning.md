# Workbench deployment learning

The implemented workbench is ready for a coach trial after separately authorized deployment and environment checks. The implementation is additive at the API; the previous frontend can continue using the legacy queues during rollback. The item ordering is version 1. No database migration or permanent feature-flag system is required.

## Coach review

Use disposable or explicitly authorized client data. Ask the coach to work unaided, narrating only when comfortable:

1. Start a normal work session with a missing plan, a waiting reply and an unreviewed check-in. Observe what they choose and whether the order matches their priorities.
2. Review an intake and prepare a client's Training and Nutrition plans. Check whether separate items make completion clear.
3. Reply to a client, then decide that another conversation needs no reply. Check whether Reading and Handled have understandable consequences.
4. Follow up a missed check-in and postpone an ending engagement. Check whether the coach expects either action to resolve other work.
5. Stop midway through a task, then return later. Observe search, navigation and recovery.
6. Drain Awaiting you while Follow-ups still contains work. Ask what they believe remains to do.

Record requests for help, misunderstood reasons, unnecessary navigation, missed obligations and work still tracked elsewhere. Measure completion time after observing a baseline. Repeated client rows and missing-plan precedence are explicit questions, not established coach preferences.

## Observations

Append dated sessions here using role/client-load/device descriptions rather than identifying information. Record the scenario, observed behavior, user explanation, proposed change and whether another observation supports it. No independent coach session has been recorded yet.

## Minimal measurement follow-up

A bounded search of current coachapp source did not identify a product analytics event path. No analytics platform or tracking SDK was added for this feature. Before launch, identify the authorized deployment's measurement sink. If one exists, instrument only workbench opens, action opens by kind, source-confirmed outcomes where attribution is available, return navigation, and request duration/error status. Use kind and ordering version, never client identity, message content, answers, or search text.

Treat any required collector or SDK integration as a separate scoped implementation decision. Meanwhile, use the scripted coach review and the reproducible query measurements. A row opening is not a completed coaching outcome.
