// Domain data specification. See requirements.md for validation and behavior.
// Names are normalized for a greenfield project; this is not an HTTP contract.

export type Id = string;
export type CalendarDate = string; // YYYY-MM-DD, a valid calendar date.
export type UtcInstant = string; // ISO 8601 UTC instant.
export type Timezone = string; // Valid IANA timezone name.
export type Revision = number; // Integer; persisted entities start at 1.
export type Weekday =
	| "monday" | "tuesday" | "wednesday" | "thursday"
	| "friday" | "saturday" | "sunday";

export interface MediaReference {
	id: Id;
	kind: "image" | "video";
	url: string | null;
}

export interface ClientCalendar {
	clientId: Id;
	clientTimezone: Timezone | null;
	businessTimezone: Timezone;
}

export type TemplateLifecycle = "active" | "archived";
export type ClientPlanLifecycle =
	| "incomplete" | "upcoming" | "current" | "ended" | "archived";

export interface PlanDetails {
	id: Id;
	businessId: Id;
	creatorId: Id | null;
	name: string;
	description: string | null;
	revision: Revision;
}

export interface TemplateIdentity {
	kind: "template";
	lifecycle: TemplateLifecycle;
}

export interface ClientPlanIdentity {
	kind: "client_plan";
	clientId: Id;
	sourceTemplateId: Id | null;
	startDate: CalendarDate | null;
	endDate: CalendarDate | null;
	lifecycle: ClientPlanLifecycle;
}

export interface Assignment {
	templateId: Id;
	clientId: Id;
	startDate: CalendarDate | null;
	endDate: CalendarDate | null;
}

export type TrackingType =
	| "weight_reps" | "bodyweight_reps" | "weighted_bodyweight"
	| "assisted_bodyweight" | "reps_only" | "duration"
	| "weight_duration" | "distance_duration" | "weight_distance";
export type SetType = "working" | "warmup" | "dropset";
export type LoadUnit = "kg" | "lbs" | "bodyweight" | "none";
export type DistanceUnit = "meters" | "km" | "miles" | "none";

export interface Muscle {
	id: Id;
	name: string;
	description: string | null;
}

export interface Equipment {
	id: Id;
	name: string;
	description: string | null;
}

export interface Exercise {
	id: Id;
	businessId: Id | null; // Null identifies shared library content.
	source: "system" | "imported" | "custom";
	name: string;
	description: string | null;
	instructions: string | null;
	trackingType: TrackingType;
	mechanics: "compound" | "isolation" | "isometric" | null;
	force: "push" | "pull" | "static" | null;
	muscleIds: Id[];
	equipmentIds: Id[];
	imageUrls: string[];
	media: MediaReference | null;
}

export interface SetMeasurements {
	setType: SetType;
	reps: string | null; // Text supports targets such as "8-12".
	loadValue: number | null;
	loadUnit: LoadUnit | null;
	durationSeconds: number | null;
	distanceValue: number | null;
	distanceUnit: DistanceUnit | null;
	rpe: number | null;
	notes: string | null;
}

export interface PrescribedSet extends SetMeasurements {
	restSeconds: number | null;
}

export interface PrescribedExercise {
	id: Id;
	exerciseId: Id;
	sets: PrescribedSet[];
}

export interface Workout {
	id: Id;
	name: string;
	exercises: PrescribedExercise[];
}

export interface TrainingPrescription {
	workouts: Workout[];
	schedule: Record<Weekday, Id | null>; // Null means rest.
}

export type TrainingTemplate = PlanDetails & TemplateIdentity & {
	prescription: TrainingPrescription;
};
export type ClientTrainingPlan = PlanDetails & ClientPlanIdentity & {
	prescription: TrainingPrescription;
};
export type TrainingPlan = TrainingTemplate | ClientTrainingPlan;

export interface TrainingGuidance {
	date: CalendarDate;
	plan: ClientTrainingPlan | null;
	scheduledWorkout: Workout | null;
}

export interface TrainingPrescriptionSnapshot {
	version: number;
	plan: { id: Id; name: string; revision: Revision };
	workout: {
		id: Id;
		name: string;
		exercises: Array<{
			ref: Id;
			exerciseId: Id; // Historical identity, independent of availability.
			exerciseName: string;
			trackingType: TrackingType;
			sets: PrescribedSet[];
		}>;
	};
}

export interface PerformedSet extends SetMeasurements {
	id: Id;
	exerciseId: Id | null; // Available library link.
	exerciseName: string; // Frozen name, required even without a library link.
	snapshotExerciseRef: Id | null;
}

export type TrainingSessionOrigin =
	| { kind: "planned"; prescriptionSnapshot: TrainingPrescriptionSnapshot }
	| { kind: "freestyle"; prescriptionSnapshot: null };

export type TrainingSessionState =
	| { state: "active"; closedAt: null }
	| { state: "completed" | "discarded"; closedAt: UtcInstant };

export type TrainingSession = TrainingSessionOrigin & TrainingSessionState & {
	id: Id;
	businessId: Id;
	clientId: Id;
	date: CalendarDate;
	startedAt: UtcInstant;
	notes: string | null;
	sorenessRating: number | null;
	performedSets: PerformedSet[];
};

export type Allergen =
	| "dairy" | "egg" | "fish" | "shellfish" | "tree_nuts"
	| "peanuts" | "wheat" | "soy" | "sesame";
export type DietaryTag =
	| "vegan" | "vegetarian" | "halal" | "kosher" | "gluten_free"
	| "dairy_free" | "low_fodmap" | "keto" | "high_protein";

export interface NutrientValues {
	calories: number | null;
	protein: number | null;
	carbohydrates: number | null;
	fat: number | null;
	fiber: number | null;
}

export interface NutrientTotals extends NutrientValues {
	complete: boolean; // Derived: all five nutrient values are known.
}

export type NutritionTargets = NutrientValues;

export type Portion =
	| { kind: "gram"; grams: number }
	| { kind: "serving"; amount: number; unit: string; label: string | null };

export interface FrozenPortion {
	selection: Portion;
	resolvedGrams: number | null; // Can be unknown for recipe servings.
}

export interface ServingSize {
	label: string;
	amount: number;
	unit: string;
	weightG: number;
	isDefault: boolean;
}

export type FoodOwnership =
	| { source: "system"; businessId: null }
	| { source: "custom"; businessId: Id };

export type Food = FoodOwnership & {
	id: Id;
	creatorId: Id | null;
	revision: Revision;
	name: string;
	brand: string | null;
	category: string | null;
	nutrientsPer100g: NutrientValues;
	sugarGPer100g: number | null;
	allergens: Allergen[];
	dietaryTags: DietaryTag[];
	notes: string | null;
	media: MediaReference | null;
	servingSizes: ServingSize[];
};

export interface RecipeIngredient {
	foodId: Id;
	portion: Portion;
}

export interface Recipe {
	id: Id;
	businessId: Id;
	creatorId: Id | null;
	revision: Revision;
	name: string;
	description: string | null;
	instructions: string | null;
	servingsCount: number;
	cookedWeightG: number | null;
	allergens: Allergen[];
	dietaryTags: DietaryTag[];
	ingredients: RecipeIngredient[];
	totalNutrients: NutrientTotals; // Calculated for the whole recipe.
}

export interface PortionChoices {
	defaultPortion: Portion;
	portionOptions: Portion[];
}

export type NutritionSource =
	| { kind: "food"; foodId: Id }
	| { kind: "recipe"; recipeId: Id };

export type MealSlot =
	| "early_morning" | "breakfast" | "mid_morning" | "lunch"
	| "afternoon" | "evening" | "dinner" | "pre_sleep"
	| "pre_workout" | "during_workout" | "post_workout";

export interface MenuItem {
	id: Id;
	source: NutritionSource;
	portion: Portion;
}

export interface Meal {
	id: Id;
	name: string;
	notes: string | null;
	items: MenuItem[];
}

export interface DayPatternSlot {
	mealSlot: MealSlot;
	mealIds: [Id, ...Id[]]; // First meal is the default.
}

export interface DayPattern {
	id: Id;
	name: string;
	slots: DayPatternSlot[];
}

export interface NutritionMenu {
	meals: Meal[];
	dayPatterns: [DayPattern, ...DayPattern[]];
	schedule: Record<Weekday, Id>;
}

export interface ResolvedMenuItem extends MenuItem {
	name: string;
	resolvedGrams: number | null;
	nutrients: NutrientTotals;
}

export interface ResolvedMeal extends Omit<Meal, "items"> {
	items: ResolvedMenuItem[];
	nutrients: NutrientTotals;
}

export interface ResolvedNutritionMenu extends Omit<NutritionMenu, "meals"> {
	meals: ResolvedMeal[];
}

export type NutritionTemplate = PlanDetails & TemplateIdentity & {
	targets: NutritionTargets;
	menu: NutritionMenu;
	assignedClientCount: number;
};
export type ClientNutritionPlan = PlanDetails & ClientPlanIdentity & {
	targets: NutritionTargets;
	menu: NutritionMenu;
};
export type NutritionPlan = NutritionTemplate | ClientNutritionPlan;

export interface NutritionCoverage {
	date: CalendarDate;
	current: ClientNutritionPlan | null;
	upcoming: ClientNutritionPlan[];
}

export interface LiveNutritionGuidance {
	date: CalendarDate;
	planId: Id;
	targets: NutritionTargets;
	dayPatternId: Id;
	slots: Array<{ mealSlot: MealSlot; meals: ResolvedMeal[] }>;
}

export interface FrozenNutritionItem {
	source: NutritionSource; // Historical identity survives library deletion.
	name: string;
	portion: FrozenPortion;
	nutrients: NutrientValues; // Full precision.
}

export interface FrozenPlannedItem extends FrozenNutritionItem {
	plannedItemRef: Id;
}

export interface FrozenOfferedMeal {
	mealId: Id;
	mealName: string;
	items: FrozenPlannedItem[];
}

export interface DiaryEntry extends FrozenNutritionItem {
	id: Id; // Identity belongs to one slot.
	plannedItemRef: Id | null;
	notes: string | null;
}

export interface DiarySlot {
	clientId: Id;
	date: CalendarDate;
	mealSlot: MealSlot;
	appliedTimezone: Timezone;
	revision: Revision;
	hasCoverage: boolean; // Coverage when the slot started.
	options: FrozenOfferedMeal[];
	mealId: Id | null;
	entries: DiaryEntry[];
}

export interface RecordedNutritionDay {
	clientId: Id;
	date: CalendarDate;
	targets: NutritionTargets; // Frozen by the first successful slot save.
	slots: DiarySlot[];
}

export type DiaryRowStatus =
	| "as_planned" | "swapped" | "pending" | "skipped" | "added" | "recorded";
export type CalorieAdherence = "none" | "under" | "on" | "over" | null;

export interface NutritionDayRow {
	id: Id;
	entryId: Id | null;
	plannedItemRef: Id | null;
	status: DiaryRowStatus;
	kind: "food" | "recipe";
	availableSource: NutritionSource | null;
	name: string;
	portion: Portion;
	nutrients: NutrientTotals;
	notes: string | null;
}

export interface NutritionDayOptionItem {
	plannedItemRef: Id;
	kind: "food" | "recipe";
	availableSource: NutritionSource | null;
	name: string;
	portion: Portion;
	nutrients: NutrientTotals;
}

export interface NutritionDaySlot {
	mealSlot: MealSlot;
	mealId: Id | null;
	revision: Revision; // Zero means unstarted; positive means recorded.
	appliedTimezone: Timezone;
	writeEligible: boolean;
	plannedCalories: number | null;
	loggedCalories: number | null;
	options: Array<{
		mealId: Id;
		mealName: string;
		items: NutritionDayOptionItem[];
	}>;
	rows: NutritionDayRow[];
}

export interface NutritionDay {
	date: CalendarDate;
	planId: Id | null; // Live covering plan, not historical provenance.
	appliedTimezone: Timezone;
	writeEligible: boolean; // Date eligibility does not grant actor permission.
	targets: NutritionTargets;
	slots: NutritionDaySlot[];
	summary: {
		planned: NutrientTotals;
		logged: NutrientTotals;
		counts: Record<DiaryRowStatus, number>;
		hasIntake: boolean;
		adherence: CalorieAdherence;
	};
}

export interface DiaryEntryInput {
	id: Id;
	plannedItemRef: Id | null;
	source: NutritionSource | null; // Null retains an available frozen basis.
	portion: Portion;
	notes: string | null;
}

export interface DiarySlotInput {
	mealSlot: MealSlot;
	expectedRevision: Revision;
	mealId: Id | null;
	entries: DiaryEntryInput[]; // Complete actual intake for this slot.
}

export interface SaveNutritionDay {
	date: CalendarDate;
	slots: DiarySlotInput[];
}

export interface SaveTrainingPrescription {
	planId: Id;
	expectedRevision: Revision;
	prescription: TrainingPrescription;
}

export interface SaveNutritionMenu {
	planId: Id;
	expectedRevision: Revision;
	menu: NutritionMenu;
}
