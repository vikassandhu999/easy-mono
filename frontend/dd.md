Training Domain Implementation Walkthrough
Overview
Successfully implemented a comprehensive Training domain for the fitness coaching SaaS platform following the approved architectural blueprint. The implementation uses a tripartite architecture separating Library (definitions), Programming (prescriptions), and Tracking (execution).

Architecture Highlights
Tripartite Domain Structure
Library DomainExercise Definitions
Programming DomainPrescription/Planning
Tracking DomainExecution/Logging
Key Design Decisions
Hybrid Scope for Exercises: System-wide exercises ( business_id = NULL) plus business-specific custom variants
Weekly Phase Templates: Phases designed once for 7 days, repeated via PhaseAssignment
Unit Normalization: All weights stored in kg (base unit)
Lineage Tracking: Workout sessions link to planned workouts for analytics while allowing divergence
Implementation Summary
Library Domain (6 schemas, 6 migrations)
Created foundational exercise library with anatomical and equipment classifications:

MuscleGroup - Anatomical groupings (e.g., "Chest", "Back")
Muscle - Specific muscles (e.g., "Pectoralis Major")
Equipment - Training equipment (e.g., "Barbell", "Dumbbells")
Exercise - Core exercise definitions with hybrid scope
ExerciseMuscles - Join table with role (primary/secondary)
ExerciseEquipment - Join table for exercise-equipment relationships
Key Feature: Hybrid scope allows system exercises shared across all businesses while supporting custom variants per business.

Programming Domain (6 schemas, 6 migrations)
Implemented prescription and planning with weekly phase templating:

TrainingPlan - Top-level plan with template/assignment support
Phase - Weekly (7-day) training template
PhaseAssignment - Links phases to specific week ranges for repetition
PlannedWorkout - Single day within a phase (day 1-7)
WorkoutElement - Join table with position and superset support
PlannedSet - Prescription with load types and rep ranges
Innovative Design: Phase repetition via PhaseAssignment eliminates duplication. A "Hypertrophy Block" phase can be assigned to weeks 1-4 and 9-12 using the same 7-day template.

Tracking Domain (2 schemas, 2 migrations)
Captures actual workout execution:

WorkoutSession - Actual workout sessions with state management
PerformedSet - Atomic fitness data with RPE and RIR
Smart Linking: Sessions reference planned_workout_id for analytics but allow complete divergence in execution.

Database Schema
Total Implementation
14 Schemas: All using UUID primary keys viaEasy.Training.Schema base module
14 Migrations: Successfully migrated with proper dependency ordering
Comprehensive Indexes: Performance-optimized for common queries
Strict Foreign Keys: Data integrity enforced at database level
Migration Execution
mix ecto.migrate
Successfully executed all migrations:

✅ create_muscle_groups
✅ create_muscles
✅ create_equipment
✅ create_exercises
✅ create_exercise_muscles
✅ create_exercise_equipment
✅ create_training_plans
✅ create_phases
✅ create_phase_assignments
✅ create_planned_workouts
✅ create_workout_elements
✅ create_workout_sessions
✅ create_performed_sets
✅ create_planned_sets
Schema Highlights
TrainingPlan with Template Support
schema "training_plans" do
  field :name, :string
  field :is_template, :boolean, default: true
  field :duration_weeks, :integer
  
  belongs_to :business, Business
  belongs_to :author, Coach
  belongs_to :client, Client  # Only for assigned instances
  belongs_to :original_template, __MODULE__
  
  has_many :phases, Phase
  has_many :phase_assignments, PhaseAssignment
end
Phase as Weekly Template
schema "phases" do
  field :name, :string
  field :description, :string
  field :goal, :string
  field :position, :integer
  
  belongs_to :training_plan, TrainingPlan
  has_many :planned_workouts, PlannedWorkout  # Max 7 (days)
  has_many :phase_assignments, PhaseAssignment
end
PhaseAssignment for Repetition
schema "phase_assignments" do
  field :start_week, :integer
  field :end_week, :integer
  
  belongs_to :training_plan, TrainingPlan
  belongs_to :phase, Phase
end
Validations & Constraints
Business Logic Validations
TrainingPlan: Templates cannot have clients; assigned plans must have clients
Phase: Unique workouts per day of week (1-7)
PlannedWorkout: Day of week must be 1-7
PlannedSet: Rep range validation (max >= min)
PerformedSet: RPE validation (1-10), RIR validation (>= 0)
WorkoutSession: End time after start time, soreness rating 1-5
Database Constraints
Unique indexes on [:name, :business_id] for exercises (hybrid scope support)
Unique indexes on [:phase_id, :day_of_week] for planned workouts
Unique indexes on [:position, :planned_workout_id] for workout elements
Foreign key cascades for proper deletion behavior
Next Steps
The foundation is complete. Next phases include:

Context Modules: Create Easy.Training.Library, Easy.Training.Programming, and Easy.Training.Tracking with CRUD operations
Copy-on-Assignment: Implement deep copy pattern for template assignment via Ecto.Multi
JSON Views: Create Phoenix JSON views for all schemas
Controllers: Add REST API endpoints
Tests: Unit and integration tests
Seed Data: Create system exercises and sample programs
Architectural Compliance
This implementation strictly follows the approved plan with all requested modifications:

✅ Removed OpenActive compatibility
✅ Renamed Program → TrainingPlan
✅ Restructured phases as weekly templates (7 days max)
✅ Added PhaseAssignment for repetition
✅ Removed ProgramWeek (redundant)
✅ All weights normalized to kg
✅ Hybrid scope for exercises
✅ UUID primary keys throughout

API Layer (3 Controllers, 3 JSON Views)
Implemented RESTful API endpoints with business scope enforcement:

ExerciseController (/api/exercises)
List exercises (system + business specific)
Create/Update/Delete custom exercises
TrainingPlanController (/api/training_plans)
List/Get plans
Create templates
Assign to Client (triggers copy-on-assignment)
WorkoutSessionController (/api/sessions)
Start/Complete sessions
Log sets
Router Updates: Added authenticated scopes for all training endpoints.

Files Created
Schemas (14 files)
lib/easy/training/schema.ex
 - Base schema module
lib/easy/training/library/*.ex (4 schemas)
lib/easy/training/programming/*.ex (6 schemas)
lib/easy/training/tracking/*.ex (2 schemas)
Context Modules (4 files)
lib/easy/training/library.ex
lib/easy/training/programming.ex
lib/easy/training/tracking.ex
lib/easy/training.ex
 (Top-level API)
API Layer (6 files)
lib/easy_web/controllers/exercise_controller.ex
lib/easy_web/controllers/exercise_json.ex
lib/easy_web/controllers/training_plan_controller.ex
lib/easy_web/controllers/training_plan_json.ex
lib/easy_web/controllers/workout_session_controller.ex
lib/easy_web/controllers/workout_session_json.ex
Migrations (14 files)
priv/repo/migrations/20251126044953_create_muscle_groups.exs
... (13 others)
Status: ✅ Full Training domain implemented (Schemas + Contexts + API). Ready for frontend integration.