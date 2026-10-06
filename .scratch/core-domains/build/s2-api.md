# Slice 2 Nutrition API

All existing coach/client prefixes remain. Old menu endpoints are removed. Whole plan create/update requests carry `content`, like Training. NutritionPlan uses TrainingPlan's shared identity/revision fields, with `meal_count` in place of `workout_count`, and NutritionContent.

- Content: `{targets, meals:[{id,name,notes?,items:[{id,source:{type:'food'|'recipe',id},portion,name?,grams?,nutrients?}]}],day_patterns:[{id,name,targets?,slots:[{id,name,meal_ids}]}],schedule:{cycle_weeks:1,entries:[{id,day,ref}]}}`.
- Nutrients: map of code to non-negative number, per 100 g in library and actual portion in plan/diary. Absent key is unknown. Codes include energy_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g.
- Targets: map of code to `{min?:number,max?:number}`.
- Portion: `{type:'grams',grams:number}` or `{type:'serving',serving_id:string,amount:number}`. Recipe's standard serving id is `serving`; grams per recipe serving derives from cooked_weight_g or ingredient mass, divided by servings_count.
- Food: existing identity/name/brand/category/source/revision/media/notes/allergens/dietary_tags/timestamps; replace all numeric nutrient columns with `nutrients`, replace serving_sizes with `servings:[{id,label,grams}]`, add `default_serving_id:string|null`, `archived_at`. Food default portion is computed by UI from servings; picker scales nutrients to that portion.
- Recipe: existing identity/name/description/instructions/revision/tags/timestamps, `servings_count`, `cooked_weight_g`, `ingredients:[{food_id,portion}]`, computed `nutrients` per 100 g and `grams` total recipe mass, `archived_at`.
- DELETE food/recipe always archives. Lists omit archived items.
- Plan publish: existing PATCH nutrition-plans/:id with expected_revision, content and optional effective_on. Withdraw DELETE nutrition-plans/:id/revisions/:revision_id. Assign uses existing clients/:client_id/nutrition-plans/:id/assign.

## Diary

Keep GET `/nutrition-days?date=...` or `from=...&to=...`, coach GET `/clients/:client_id/nutrition-days`. Response `{data: NutritionDay[]}`.

NutritionDay: `{date,timezone,write_eligible,plan_id,plan_revision_id,plan_revision_number,targets,target_changed,totals,counts:{expected,recorded},slots,extra_meals}`. Totals is map code -> `{value:number|null,known_entries:number,total_entries:number}`; any missing value makes value null, preserving known count. Empty diary totals contain registry codes with value null/count 0.

Slot: `{id,name,plan_revision_id,options:NutritionMeal[],meal:DiaryMeal|null,status:'recorded'|'not_recorded'}`. options and meal item values are copied prescriptions. Extra meals have no slot.

DiaryMeal: `{id,local_date,timezone,plan_revision_id,slot_id,name,chosen_meal_id,note_to_coach,shared_at,revision,request_id,entries:DiaryEntry[]}`.
DiaryEntry: `{id,planned_item_id,source:{type,id}|null,portion:Portion|null,name,grams:number|null,nutrients,notes,request_id}`. Quick add: source/portion/grams null; caller supplies name/nutrients.

PATCH `/nutrition-days/:date`: `{meals:[{id,expected_revision,request_id,plan_revision_id:null|string,slot_id:null|string,name,chosen_meal_id:null|string,note_to_coach?:string|null,share?:boolean,entries:[{id,request_id,planned_item_id:null|string,source:null|{type,id},portion:null|Portion,name?:string,nutrients?:NutrientMap,notes?:string|null}]}]}`. Response `{data:NutritionDay}`. Each meal replacement is journalled inside one transaction. Existing expected_revision 0 creates. Planned unchanged items use published item values. Swaps/extras resolve the current library. Quick add trusts validated explicit nutrient numbers.

GET coach `/clients/:client_id/nutrition-food-metrics?from=...&to=...`: `{data:[{food_id,name,entries_count,days_count,average_grams,nutrients:Totals}]}`. Recipe entries contribute each food from immutable ingredient contributions copied with the eaten entry.
