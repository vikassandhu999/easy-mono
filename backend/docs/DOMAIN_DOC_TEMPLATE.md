# Domain Documentation Template

> **Purpose:** This document provides a standardized template and instructions for documenting any domain in the Easy system. Following this template ensures consistency and completeness across all domain documentation.

---

## Instructions for AI Agents

When asked to document a domain, follow these steps:

### Step 1: Gather Information

Before writing documentation, explore the codebase to find:

1. **Schema file(s):** `lib/easy/<context>/<entity>.ex`
2. **Context file(s):** `lib/easy/<context>.ex` or `lib/easy/<context>/<subcontext>.ex`
3. **Controller file(s):** `lib/easy_web/controllers/<entity>_controller.ex`
4. **JSON view file(s):** `lib/easy_web/controllers/<entity>_json.ex`
5. **Router entries:** `lib/easy_web/router.ex`
6. **Migration file(s):** `priv/repo/migrations/*_create_<entity>.exs`
7. **Related schemas:** Any associated entities (belongs_to, has_many)

### Step 2: Document Using the Template Below

Create documentation in `docs/domains/<ENTITY>.md` following the structure provided.

### Step 3: Identify Issues

While documenting, actively look for:

- Missing authorization checks
- Tenant isolation violations (missing `business_id` checks)
- Missing flows that should exist
- Inconsistent behavior between similar operations
- Security vulnerabilities

---

## Template Structure

Use the following structure for all domain documentation:

```markdown
# [Entity Name] Domain

> **Last Updated:** YYYY-MM-DD
> **Status:** [Draft | Review | Approved]

---

## 1. Definition

[2-3 sentences explaining what this entity represents in the system, its purpose, and how it relates to the business domain.]

### Key Concepts

- **Concept 1:** Brief explanation
- **Concept 2:** Brief explanation

---

## 2. Schema

### Entity: `[entity_name]`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `binary_id` | Yes | Auto | Primary key (UUID) |
| `field_name` | `type` | Yes/No | value | Description |
| ... | ... | ... | ... | ... |

### Associations

| Association | Type | Related Entity | Description |
|-------------|------|----------------|-------------|
| `belongs_to` | N:1 | Entity | Description |
| `has_many` | 1:N | Entity | Description |

### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| Primary | `id` | Unique | Primary key |
| ... | ... | ... | ... |

### Constraints

- **Unique:** [field combinations]
- **Foreign Key:** [relationships and cascade behavior]

---

## 3. Types/Categories

[If the entity has different types or categories, document them here]

### Type 1: [Name]

- **Identifier:** How to identify this type (e.g., `business_id = nil`)
- **Description:** What this type represents
- **Permissions:** Who can create/read/update/delete
- **Special Rules:** Any special handling

### Type 2: [Name]

- **Identifier:** ...
- **Description:** ...
- **Permissions:** ...
- **Special Rules:** ...

---

## 4. API Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/api/entities` | index | List all entities |
| GET | `/api/entities/:id` | show | Get single entity |
| POST | `/api/entities` | create | Create new entity |
| PUT | `/api/entities/:id` | update | Update entity |
| DELETE | `/api/entities/:id` | delete | Delete entity |
| ... | ... | ... | ... |

---

## 5. Flows

### Flow 1: [Flow Name] (e.g., Creation)

#### Description
[What this flow accomplishes]

#### Preconditions
- [ ] Condition 1
- [ ] Condition 2

#### Actor(s)
- Who can perform this action

#### Steps
1. Step 1
2. Step 2
3. ...

#### Validation Rules
- Rule 1
- Rule 2

#### Success Response
- HTTP Status: XXX
- Returns: [description]

#### Error Responses
| Scenario | HTTP Status | Error |
|----------|-------------|-------|
| Scenario 1 | 4XX | Error message |

#### Code Path
```
Controller.action -> Context.function -> Schema.changeset -> Repo.operation
```

---

### Flow 2: [Flow Name]

[Repeat the same structure for each flow]

---

## 6. Authorization Matrix

| Action | System Admin | Business Owner | Coach | Client |
|--------|--------------|----------------|-------|--------|
| List | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| Show | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| Create | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ✅ (own) | ❌ | ❌ |
| Delete | ✅ | ✅ (own) | ❌ | ❌ |

Legend:
- ✅ = Allowed
- ❌ = Denied
- (own) = Only for owned resources
- (assigned) = Only for assigned resources

---

## 7. Tenant Isolation

### Data Scoping Rules

- **Query Pattern:** How queries filter by tenant
- **Creation Rule:** How tenant is assigned on create
- **Cross-tenant Access:** Any exceptions (e.g., system-level data)

### Implementation Checklist

- [ ] All queries include `business_id` filter
- [ ] `business_id` is set programmatically, not from user input
- [ ] System-level entities are read-only for tenants

---

## 8. Known Issues & Missing Flows

### Issues

| ID | Severity | Description | Affected Flow | Recommendation |
|----|----------|-------------|---------------|----------------|
| 1 | Critical/High/Medium/Low | Description | Flow name | How to fix |

### Missing Flows

| Flow | Description | Priority | Notes |
|------|-------------|----------|-------|
| Flow name | What's needed | High/Medium/Low | Additional context |

---

## 9. Testing Checklist

### Unit Tests
- [ ] Schema changeset validations
- [ ] Context function happy paths
- [ ] Context function error cases

### Integration Tests
- [ ] Each API endpoint
- [ ] Authorization checks
- [ ] Tenant isolation

### Security Tests
- [ ] Cannot access other tenant's data
- [ ] Cannot modify protected resources
- [ ] Input validation (no atom injection, etc.)

---

## 10. Related Documentation

- [Link to related domain docs]
- [Link to API guide]
- [Link to frontend implementation guide]
```

---

## Severity Definitions

When documenting issues, use these severity levels:

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | Security vulnerability, data breach risk | Missing tenant isolation allows cross-tenant access |
| **High** | Major functionality broken, data integrity at risk | Users can delete system resources |
| **Medium** | Incorrect behavior, workaround exists | Validation missing but UI prevents bad input |
| **Low** | Minor issue, cosmetic, or edge case | Error message could be clearer |

---

## Checklist Before Submission

Before finalizing domain documentation:

- [ ] All schema fields documented with accurate types
- [ ] All API endpoints listed with correct paths
- [ ] All flows documented with preconditions and steps
- [ ] Authorization matrix is accurate
- [ ] Tenant isolation rules are verified against code
- [ ] Known issues are documented with severity
- [ ] Missing flows are identified
- [ ] Code paths are traced and verified

---

## Example Usage

To document a new domain, an agent should:

1. Receive request: "Document the [Entity] domain"
2. Explore codebase using grep/read_file
3. Fill in the template sections
4. Identify and document issues
5. Create file at `docs/domains/[ENTITY].md`
6. Optionally suggest fixes for critical/high issues