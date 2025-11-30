# CoachEasy Product Overview

**CoachEasy** is a B2B SaaS platform designed to help health/fitness coaches manage their clients, create customized workout and nutrition programs, and track client progress—all within a multi-tenant, business-scoped architecture.

---

## What It Is

A coaching business management platform built with **Elixir/Phoenix** and **PostgreSQL**, enabling coaches to run their coaching practice digitally. It's positioned between MVP and full product, with a focus on simplicity and core value delivery.

---

## For Whom It Is

| Actor | Description |
|-------|-------------|
| **Business/Owner** | A coaching business entity (currently single-coach businesses). Owns the tenant and has a subscription. |
| **Coach** | Professionals (health, fitness, nutrition coaches) who create and manage programs for clients. Invited or self-registered (owner). |
| **Client** | End-users who receive coaching. Always invited by a coach; cannot self-register directly. |

Key isolation principle: A single **User** can simultaneously be a Coach in one business and a Client in another.

---

## How It Works

1. **Coach Registration Flow**: Coach signs up → verifies OTP → creates business → becomes business owner with an active subscription.
2. **Client Onboarding**: Coach invites client via email → client receives invitation token → client signs up → linked to business as active client.
3. **Program Creation**: Coaches build reusable templates (Nutrition Plans, Training Plans) with nested structures (phases, workouts, meals, exercises, recipes).
4. **Assignment**: Templates are deep-copied and assigned to specific clients for personalization.
5. **Tracking**: Clients log workouts/meals; sessions capture progress data (sets, reps, weights, soreness ratings).

Core technical patterns:
- **Tenant isolation** via `business_id` on all queries
- **Passwordless (OTP) authentication** via email
- **JWT tokens** for session management
- **Scope-based authorization** extracted from token claims

---

## What It Does

| Module | Capabilities |
|--------|--------------|
| **Accounts** | User identity, OTP-based auth, session/JWT management |
| **Organizations** | Business creation, subscription management, coach roster |
| **Clients** | Client invitations, status lifecycle (pending → active → archived), coach-client assignments |
| **Nutrition** | Ingredients, recipes, meals, nutrition plans (week-based, up to 4 weeks), calorie/macro tracking |
| **Training** | Exercises (system + custom), training plans, phases, planned workouts, workout sessions, set logging |

---

## Further Considerations

1. **Multi-coach support?** Current docs hint at single-owner businesses, but schema supports multiple coaches per business.
2. **Client-side mobile app?** Stack shows React/TypeScript/Mantine frontend—confirm if native mobile is planned.
3. **Analytics/Reporting?** Training API guide mentions optional analytics phase—clarify priority.
