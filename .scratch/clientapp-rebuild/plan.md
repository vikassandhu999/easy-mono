# Client app

Build mobile screens for iOS and Android in `frontend/apps/clientapp`. Browsers and tablets render the same mobile interface. Use this app's API, auth and shared primitives; neither v2 app is a design reference.

## Product scope

Clients accept direct invitations, sign in with email OTP, and open Today. Today links to training, nutrition and messages. Clients can follow their assigned plans, record and correct workouts and meals, read their history, and send messages and attachments to their coach.

Plan guidance uses the client's local date. Recorded prescriptions and nutrient values retain their snapshot rules. Notes on workouts and meals can be sent as chat messages with a source reference. Account details remain supported.

## Delivery

Complete entry, action, persistence, interruption recovery and return path against Phoenix before marking a workflow delivered. Verify browser flows at 375px. Preserve mobile drafts, secure credentials, upload recovery, accessibility and offline read/write distinctions.

See [native auth](auth-native.md), [credential storage](credential-storage.md), [training](training.md), [nutrition](nutrition.md), [messaging](messaging.md). Device and real-client usability checks remain separate from browser checks.

The approved local reset and its verification are tracked in [the reset plan](../core-reset/plan.md). Historic verification remains in checkpoint branches.
