# Multi-Coach Permissions Guide

## Overview

This document explains how client access works when your business has multiple coaches.

## Current Schema Design

```elixir
# Client belongs to BUSINESS (primary)
client.business_id  # Required - defines tenant boundary
client.coach_id     # Optional - tracks assigned/primary coach
```

**Key Design Decision:** Clients belong to the **business first**, coach assignment is secondary.

## Permission Models

### Phase 1: MVP (One Coach) ✅ **CURRENT**

**Model:** Business owner is the only coach

```elixir
# Single coach sees all business clients
def list_clients_for_coach(coach) do
  list_clients(coach.business_id)
end
```

**Use Case:**
- Solo coach/trainer starting their business
- Simple, no permission complexity needed

---

### Phase 2: Business-Wide Access ✅ **RECOMMENDED NEXT**

**Model:** All coaches in a business can see and manage all clients

```elixir
# Any coach sees all clients in their business
def list_clients_for_coach(coach) do
  Client
  |> where([c], c.business_id == ^coach.business_id)
  |> Repo.all()
end
```

**Pros:**
- ✅ Simple to implement (already built-in!)
- ✅ Great for small teams (2-5 coaches)
- ✅ Promotes collaboration and coverage
- ✅ Easy client handoffs

**Cons:**
- ⚠️ Less privacy between coaches
- ⚠️ May not work for competitive/independent coaches

**Use Case:**
- Small gym with team of trainers
- Boutique fitness studio
- Collaborative coaching practice

**Implementation:** Already built! Just use `list_clients_for_coach(coach)`

---

### Phase 3: Coach-Specific Access (Future)

**Model:** Coaches only see clients assigned to them, business owner sees all

```elixir
# Coach sees only assigned clients
def list_clients_for_coach(coach, assigned_only: true) do
  Client
  |> where([c], c.business_id == ^coach.business_id)
  |> where([c], c.coach_id == ^coach.id)  # Filter by assignment
  |> Repo.all()
end

# Business owner sees all
def list_clients_for_business_owner(business_id) do
  Client
  |> where([c], c.business_id == ^business_id)
  |> Repo.all()
end
```

**Requires Adding:**
1. Role field on coaches (`:owner`, `:coach`, `:assistant`)
2. Permission checks in controllers
3. Business settings for access model

**Pros:**
- ✅ Privacy between coaches
- ✅ Clear ownership
- ✅ Scalable to large teams

**Cons:**
- ⚠️ More complex logic
- ⚠️ Need to handle unassigned clients
- ⚠️ Requires role/permission system

**Use Case:**
- Large businesses (10+ coaches)
- Independent contractors sharing a platform
- Competitive/private coaching scenarios

---

## Implementation Details

### Current Code (Already Implemented)

```elixir
# In Easy.Tenant context

# Business