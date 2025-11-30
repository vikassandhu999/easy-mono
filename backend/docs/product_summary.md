# Easy Coaching Platform - Product Summary

## What It Is

**Easy** is a comprehensive **SaaS platform for fitness and nutrition coaches** to manage their coaching business and deliver programs to their clients. It's a multi-tenant, cloud-based coaching management system built with Phoenix/Elixir that provides coaches with professional tools to:

- Manage client relationships and subscriptions
- Create and deliver nutrition plans with recipes and meal tracking
- Design and assign training programs with workout tracking
- Communicate with clients and track their progress
- Run their coaching business with subscription management

The platform operates on a **B2B2C model** where coaches (businesses) pay for the service to manage and serve their clients.

---

## For Whom It Is

### Primary Users: Coaches

**Target Profile:**
- Fitness coaches, personal trainers, nutritionists, strength coaches
- Solo coaches and small coaching businesses
- Coaches who want to digitize and scale their coaching practice
- Professionals seeking to move from in-person to online or hybrid coaching

**Pain Points Solved:**
- Managing client information and programs across spreadsheets and documents
- Manually creating nutrition plans and training programs for each client
- Tracking client progress and compliance
- Scaling their coaching business beyond 1-on-1 sessions
- Collecting payments and managing subscriptions

### Secondary Users: Clients

**Target Profile:**
- Individuals working with fitness or nutrition coaches
- People seeking structured training and nutrition guidance
- Clients who want digital access to their programs and progress tracking

**Client Benefits:**
- Access to personalized training and nutrition plans
- Progress tracking and workout logging
- Direct connection with their coach
- Mobile-accessible programs and resources

---

## How It Works

### Architecture & Technical Approach

**Multi-Tenant SaaS Model:**
```
Business (Coaching Company)
  ├── Coaches (Staff/Owners)
  ├── Clients (Customers)
  ├── Subscription & Plan
  └── Business Data (Recipes, Programs, Templates)
```

**Key Technical Features:**
1. **Complete Data Isolation** - Each business's data is completely isolated with business_id scoping
2. **Passwordless Authentication** - OTP-based email authentication (no passwords to manage)
3. **Cookie-Based Security** - HTTP-only cookies with XSS and CSRF protection
4. **RESTful API** - Clean REST endpoints with role-based access control
5. **Subscription-Based Access** - Feature limits enforced based on subscription tier

### User Flows

#### Coach Onboarding Flow
```
1. Coach signs up with email → receives OTP
2. Verifies email with OTP code
3. Creates business profile (business name, handle)
4. Automatically created as owner/coach
5. Starts with trial subscription (30 days)
6. Can invite clients and create programs
```

#### Client Invitation Flow
```
1. Coach invites client (email + name)
2. Client receives invitation email
3. Client signs up with their own email (can be different)
4. Client verifies email with OTP
5. Account linked to coach's business
6. Client gets access to assigned programs
```

#### Program Delivery Flow
```
Coach Side:
1. Create nutrition plans/recipes (templates or client-specific)
2. Create training programs/workouts (templates or client-specific)
3. Assign template to client → creates personalized copy
4. Monitor client progress and compliance

Client Side:
1. View assigned nutrition and training plans
2. See today's scheduled workout
3. Log workout sets (weight, reps, RPE)
4. Track progress over time
5. Access meal plans and recipes
```

---

## What It Does

### Core Feature Domains

#### 1. **Nutrition Management**

**Recipe Library:**
- Create and manage recipe database with embedded ingredients
- Define servings, prep time, cook time, instructions
- Manually enter nutritional values (calories, protein, carbs, fats, fiber)
- Share recipes across the business
- Search and filter recipes

**Meal Planning:**
- Create nutrition plans as templates or client-specific
- Build multi-day/multi-week meal plans
- Organize meals by day and meal type (breakfast, lunch, dinner, snack)
- Add recipes to meals with serving multipliers
- Duplicate days and entire plans
- Bulk create meal structures (standard 5-meal/day or simple 3-meal/day)

**Plan Assignment:**
- Create reusable nutrition plan templates
- Assign templates to clients (creates personalized copy)
- Customize plans for individual client needs
- Set plan duration and start dates

#### 2. **Training Program Management**

**Exercise Library:**
- Access system-wide exercise database (shared exercises)
- Create custom business-specific exercises
- Categorize by mechanics (compound, isolation, isometric)
- Tag exercises by force type (push, pull, static)
- Associate exercises with muscles and equipment

**Program Building:**
- Create training plan templates with multiple phases
- Design 7-day phase templates (weekly structure)
- Build workouts with exercises, sets, and reps
- Define load prescriptions (absolute weight, %1RM, RPE)
- Create supersets and exercise sequences
- Assign phases to specific weeks (phase assignments)

**Workout Tracking:**
- Clients log live workout sessions
- Track sets, reps, weight (normalized to kg)
- Record RPE and RIR (reps in reserve)
- Add session notes and soreness ratings
- View workout history and progress

**Copy-on-Assignment:**
- Assign template to client → creates full deep copy
- Client gets their own version to track against
- Template remains unchanged for future use
- Enables client-specific modifications

#### 3. **Client Management**

**Client Lifecycle:**
- Invite clients via email with invitation tokens
- Client statuses: pending, active, inactive, archived
- Link client accounts to business via invitation flow
- Resend invitations if needed
- Archive/deactivate clients

**Client Information:**
- Store client profiles (name, email, phone)
- Coach notes and preferences
- View assigned coaches (multi-coach support)
- Track client status and engagement

**Subscription Enforcement:**
- Enforce max client limits based on subscription plan
- Return 402 Payment Required when limit reached
- Guide coaches to upgrade subscription

#### 4. **Business & Organization Management**

**Business Profile:**
- Business name and unique handle
- Business settings and branding
- Public join settings (optional open enrollment)
- Business-level resource sharing (recipes, exercises, programs)

**Coach Management:**
- Multiple coaches per business
- Coach profiles with bio, specialties, credentials
- Role-based access control
- Owner vs. coach permissions

**Subscription System:**
- Trial subscriptions (default 30 days)
- Plan-based feature limits:
  - Max coaches
  - Max clients
  - Storage limits
  - Feature access
- Subscription status tracking: trial, active, expired, cancelled
- Automatic limit enforcement

#### 5. **Authentication & Security**

**Passwordless Authentication:**
- OTP (One-Time Password) via email
- 6-digit codes expire in 10 minutes
- Max 3 verification attempts
- Rate limiting (3 requests per 15 minutes)
- Token-based flow with explicit token_id references

**Session Management:**
- JWT access tokens (7-day expiration)
- JWT refresh tokens (30-day expiration)
- Cookie-based (HTTP-only, secure) or token-based auth
- Automatic session refresh
- Secure logout with token revocation

**Security Features:**
- HTTP-only cookies (XSS protection)
- SameSite=Lax (CSRF protection)
- Multi-tenant data isolation by business_id
- Role-based access control (coach/client roles)
- Email verification required

---

## Business Model & Value Proposition

### Revenue Model

**Subscription-Based SaaS:**
- Monthly/annual subscriptions per business
- Tiered plans based on:
  - Number of coaches
  - Number of clients
  - Storage/resources
  - Feature access
- Trial period to onboard and convert coaches

### Value Propositions

**For Coaches:**
- ✅ **Professional Tools** - Legitimate software alternative to spreadsheets/docs
- ✅ **Time Savings** - Templates and reusable programs reduce repetitive work
- ✅ **Scalability** - Serve more clients without proportional time increase
- ✅ **Client Experience** - Modern, mobile-friendly client interface
- ✅ **Business Management** - Built-in subscription and client tracking
- ✅ **Flexibility** - Works for nutrition, training, or both
- ✅ **No Technical Skills Required** - Simple, coach-friendly interface

**For Clients:**
- ✅ **Accessibility** - Access programs anywhere, anytime
- ✅ **Clarity** - Clear, structured plans vs. static PDFs
- ✅ **Progress Tracking** - Log workouts and see improvement
- ✅ **Professional Experience** - Branded, polished platform
- ✅ **Direct Coach Connection** - Within their coach's ecosystem

---

## Technical Architecture

### Technology Stack

**Backend:**
- **Framework:** Phoenix 1.8 (Elixir/Erlang OTP)
- **Database:** PostgreSQL with Ecto ORM
- **Authentication:** JWT tokens, OTP generation, Bcrypt
- **Email:** Swoosh (supports Postmark, SendGrid, Mailgun, SMTP)
- **API:** RESTful JSON API with cookie-based auth

**Key Dependencies:**
- `phoenix` - Web framework
- `ecto_sql` + `postgrex` - Database layer
- `joken` - JWT token generation/verification
- `bcrypt_elixir` - Secure hashing
- `swoosh` - Email delivery
- `cors_plug` - CORS support for frontend apps

### Design Patterns

**Context-Driven Architecture:**
```
Easy (Application)
  ├── Accounts (User identity, OTP, sessions)
  ├── Auth (Authorization, scope, JWT)
  ├── Organizations (Business, coaches, subscriptions)
  ├── Clients (Client management, invitations)
  ├── Nutrition (Recipes, meals, nutrition plans)
  └── Training (Exercises, training plans, workout sessions)
```

**Multi-Tenancy:**
- Every resource scoped by `business_id`
- Database-level filtering on all queries
- Authorization helpers ensure business isolation
- Cross-business access impossible

**Subscription Awareness:**
- Limits enforced at context layer
- Graceful degradation with clear error messages
- Upgrade prompts when limits reached

---

## Current State & Maturity

### Production-Ready Features
- ✅ Complete authentication system with OTP
- ✅ Multi-tenant business management
- ✅ Client invitation and onboarding flow
- ✅ Subscription management with trial support
- ✅ Nutrition domain (recipes, meals, nutrition plans)
- ✅ Training domain (exercises, programs, workout tracking)
- ✅ Role-based access control
- ✅ Cookie-based secure authentication

### Development Features
- 🚧 Development OTP bypass ("123456" always works)
- 🚧 Local email viewing at `/dev/mailbox`
- 🚧 Test suite for core functionality

---

## Competitive Position

### Differentiators

1. **Dual Domain Focus** - Both nutrition AND training in one platform (vs. specialized tools)
2. **Template System** - Efficient program reuse and customization
3. **Multi-Tenant** - Each business fully isolated with their own branding
4. **Passwordless** - Modern auth without password management headaches
5. **Developer-Friendly** - Clean API, good documentation, simple to integrate
6. **Subscription Flexibility** - Not locked into client seat pricing

### Target Market

**Primary:** Solo coaches and small coaching businesses (1-5 coaches, 10-100 clients)

**Secondary:** Growing coaching businesses looking to standardize operations

**Not For:** 
- Large fitness franchises (would need enterprise features)
- Casual fitness apps for end consumers (B2C model)
- Coaches who only do in-person training

---

## Summary

**Easy** is a modern, full-stack coaching platform that empowers fitness and nutrition coaches to digitize and scale their coaching practice. By providing professional tools for nutrition planning, training program design, client management, and business operations, it enables coaches to serve more clients effectively while delivering a superior client experience. Built on a secure, multi-tenant architecture with subscription-based access control, it's designed to grow with coaching businesses from solo practitioners to small teams.

**Target Outcome:** Help coaches transition from manual, spreadsheet-based coaching to a professional, scalable digital coaching business.
