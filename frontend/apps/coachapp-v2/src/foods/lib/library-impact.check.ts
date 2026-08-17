import {hasLibraryUsage, libraryInUseMessage, normalizeLibraryImpact} from './library-impact.ts';

const foodImpact = {
  recipes: [{id: 'recipe-1', name: 'Lassi'}],
  templates: [{id: 'plan-1', name: 'Cut'}],
  active_client_plans: [{id: 'plan-2', name: 'Client Cut', client_id: 'client-1'}],
};

const impact = normalizeLibraryImpact(foodImpact);
if (impact.recipes.length !== 1 || impact.recipes[0]?.name !== 'Lassi') {
  throw new Error('food impact must keep Recipe names without tenant fields');
}
if (impact.templates[0]?.id !== 'plan-1' || impact.active_client_plans[0]?.name !== 'Client Cut') {
  throw new Error('food impact must keep Template and Client Plan names');
}
if (!hasLibraryUsage(impact)) {
  throw new Error('populated impact must count as in use');
}

const empty = normalizeLibraryImpact({recipes: [], templates: [], active_client_plans: []});
if (hasLibraryUsage(empty)) {
  throw new Error('empty buckets must not count as in use');
}

const recipeOnly = normalizeLibraryImpact({
  templates: [{id: 'plan-3', name: 'Old Cut'}],
  active_client_plans: [],
});
if (recipeOnly.recipes.length !== 0 || recipeOnly.templates[0]?.name !== 'Old Cut') {
  throw new Error('recipe impact must omit recipes and keep Template names');
}

const inUse = {
  data: {
    error_code: 'in_use',
    error_message: 'This item is still used by a plan or recipe. Remove it there first.',
  },
};
if (libraryInUseMessage(inUse, "Couldn't delete food") !== inUse.data.error_message) {
  throw new Error('in-use conflicts must use the server message');
}

if (libraryInUseMessage({data: {error_code: 'stale_revision'}}, "Couldn't delete food") !== "Couldn't delete food") {
  throw new Error('non-in-use errors must keep the caller fallback');
}

console.log('library-impact checks passed');
