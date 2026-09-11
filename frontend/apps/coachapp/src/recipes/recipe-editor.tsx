import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Recipe, useRecipe, useRecipes, useSaveRecipe} from '../api/recipes';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';

import {Ingredients} from './ingredients';
import {body, fields, positive} from './recipe';
export function RecipeEditor() {
  const {id} = useParams();
  return id ? (
    <LoadEditor
      key={id}
      id={id}
    />
  ) : (
    <Editor
      key="new"
      initial={undefined}
    />
  );
}
function LoadEditor({id}: {id: string}) {
  const query = useRecipe(id);
  const [initial, setInitial] = useState<Recipe>();
  const {to, state} = useListLocation(routes.recipes);
  useEffect(() => {
    if (!initial && query.isSuccess && query.isFetchedAfterMount) {
      setInitial(query.data.data);
    }
  }, [initial, query.data, query.isSuccess, query.isFetchedAfterMount]);
  if (initial) {
    return <Editor initial={initial} />;
  }
  return (
    <Page>
      <PageHeader
        title="Recipe"
        back={{to, label: 'Back to recipes', state}}
      />
      <Surface>
        {query.isError ? (
          <div className="space-y-3">
            <FormError message={errorMessage(query.error, 'Could not load this recipe.')} />
            <Button
              isPending={query.isFetching}
              onPress={() => {
                query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <p role="status">Loading recipe…</p>
        )}
      </Surface>
    </Page>
  );
}
function Editor({initial}: {initial: Recipe | undefined}) {
  const [recipe, setRecipe] = useState(initial);
  const form = useForm({defaultValues: fields(initial)});
  const save = useSaveRecipe();
  const query = useRecipe(recipe?.id ?? '');
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reload, setReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {to, state} = useListLocation(routes.recipes);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || reloading;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (form.formState.errors.root) {
      errorRef.current?.focus();
      errorRef.current?.scrollIntoView({block: 'center'});
    }
  }, [form.formState.errors.root]);
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending],
    ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending],
    ),
  );
  function resetRecipe(saved: Recipe) {
    setRecipe(saved);
    form.reset(fields(saved));
    setConflict(false);
    setUncertain(false);
    setChecking(false);
  }
  return (
    <Page>
      <PageHeader
        title={initial ? 'Edit recipe' : 'Create recipe'}
        description={
          initial
            ? 'Changes update this library recipe wherever it is used in meal plans.'
            : 'Bring ingredients together into a recipe you can reuse.'
        }
        back={{to, label: 'Back to recipes', state}}
      />
      <form
        noValidate
        className="has-mobile-actions min-w-0 space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          if (conflict || uncertain || pending) {
            return;
          }
          form.clearErrors();
          setNotice('');
          try {
            const input = body(values);
            const result = await save.mutateAsync(
              recipe
                ? {kind: 'update', id: recipe.id, body: {...input, expected_revision: recipe.revision}}
                : {kind: 'create', body: input},
            );
            if (!mounted.current) {
              return;
            }
            resetRecipe(result.data);
            setNotice('Recipe saved.');
            if (!initial) {
              leaving.current = true;
              navigate(generatePath(routes.recipe, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            const stale = error instanceof ApiError && error.status === 409;
            setConflict(stale);
            const unknownCreate = !recipe && (!(error instanceof ApiError) || error.status >= 500);
            setUncertain(unknownCreate);
            form.setError('root', {
              message: stale
                ? 'This recipe changed elsewhere. Your edits are still here. Load the saved version before editing again.'
                : unknownCreate
                  ? 'Creation could not be confirmed. Check saved recipes before trying again; your draft is still here.'
                  : errorMessage(
                      error,
                      'The save could not be confirmed. Your edits are still here. Check the saved version before retrying.',
                    ),
            });
          }
        })}
      >
        <fieldset
          disabled={pending}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">Recipe information</legend>
          <FormField
            control={form.control}
            name="name"
            label="Recipe name"
            isRequired
            maxLength={255}
            rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter a recipe name.'}}
          />
          <div className="max-w-sm">
            <FormField
              control={form.control}
              name="servings_count"
              label="Makes how many servings?"
              isRequired
              inputMode="numeric"
              description="Ingredients below make this many servings in total."
              rules={{
                validate: (value) =>
                  (Number.isInteger(Number(value)) && Number(value) > 0) || 'Enter a whole number greater than zero.',
              }}
            />
          </div>
          <Ingredients
            key={recipe?.revision ?? 'new'}
            form={form}
            disabled={pending}
          />
          <details>
            <summary className="w-fit cursor-pointer py-2 font-medium">Preparation and portion details</summary>
            <div className="mt-3 space-y-4">
              <FormField
                control={form.control}
                name="cooked_weight_g"
                label="Finished weight · g (optional)"
                inputMode="decimal"
                description="Add the total prepared weight to use gram portions in meal plans."
                rules={{validate: (value) => !String(value).trim() || positive(value)}}
              />

              <FormField
                control={form.control}
                name="description"
                label="Short description"
                multiline
                maxLength={5000}
              />
              <FormField
                control={form.control}
                name="instructions"
                label="Preparation instructions"
                multiline
                maxLength={10000}
              />
            </div>
          </details>
        </fieldset>
        <section
          className="space-y-3"
          aria-label="Recipe nutrition"
        >
          <h2 className="text-lg font-bold">Nutrition · whole recipe</h2>
          {dirty || !recipe ? (
            <p className="text-sm text-muted-foreground">Save the recipe to see nutrition for these ingredients.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {(['calories', 'protein', 'carbohydrates', 'fat', 'fiber'] as const).map((name) => (
                  <div key={name}>
                    <dt className="text-xs capitalize text-muted-foreground">{name}</dt>
                    <dd className="mt-1 font-semibold">
                      {recipe.nutrients[name] === null
                        ? 'Unknown'
                        : `${recipe.nutrients[name]} ${name === 'calories' ? 'kcal' : 'g'}`}
                    </dd>
                  </div>
                ))}
              </dl>
              {!recipe.nutrients.complete && (
                <p className="text-sm text-muted-foreground">Some ingredients have missing nutrition values.</p>
              )}
            </>
          )}
        </section>
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3"
        >
          <FormError message={form.formState.errors.root?.message} />
          {form.formState.errors.root && recipe && (
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => setReload(true)}
            >
              Review saved version
            </Button>
          )}
          {uncertain && (
            <Button
              variant="outline"
              onPress={() => setChecking(true)}
            >
              Check saved recipes
            </Button>
          )}
        </div>
        {notice && !dirty && <p role="status">{notice}</p>}
        <p
          role="status"
          className="text-xs text-muted-foreground"
        >
          {dirty ? 'Unsaved changes' : recipe ? 'All changes saved' : 'New recipe'}
        </p>
        <FormActions>
          <Button
            variant="ghost"
            isDisabled={pending}
            onPress={() => navigate(to, {state})}
          >
            Back to recipes
          </Button>
          <Button
            type="submit"
            isPending={pending}
            isDisabled={!dirty || conflict || uncertain}
          >
            Save recipe
          </Button>
        </FormActions>
      </form>
      {checking && (
        <CreationRecovery
          name={form.getValues('name')}
          onClose={() => setChecking(false)}
          onUse={(saved) => {
            leaving.current = true;
            navigate(generatePath(routes.recipe, {id: saved.id}), {replace: true, state});
          }}
          onRetry={() => {
            setChecking(false);
            setUncertain(false);
            form.clearErrors('root');
          }}
        />
      )}
      <Dialog
        isOpen={reload}
        isDismissable={!reloading}
        showCloseButton={!reloading}
        onOpenChange={(open) => {
          if (!reloading) {
            setReload(open);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Load saved recipe?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>This replaces your unsaved edits with the saved recipe.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              variant="outline"
              isDisabled={reloading}
              onPress={() => setReload(false)}
            >
              Keep editing
            </Button>
            <Button
              isPending={reloading}
              onPress={async () => {
                setReloading(true);
                try {
                  const result = await query.refetch();
                  if (result.error) {
                    throw result.error;
                  }
                  if (result.data && mounted.current) {
                    resetRecipe(result.data.data);
                    setReload(false);
                    setNotice('Saved version loaded.');
                  }
                } catch (error) {
                  if (mounted.current) {
                    setReload(false);
                    form.setError('root', {
                      message: errorMessage(error, 'Could not load the saved recipe. Your edits are still here.'),
                    });
                  }
                } finally {
                  if (mounted.current) {
                    setReloading(false);
                  }
                }
              }}
            >
              Load saved recipe
            </Button>
          </div>
        </div>
      </Dialog>
      <Dialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Leave without saving?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>Your unsaved changes will be lost.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.reset();
                }
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="outline"
              isDisabled={pending}
              onPress={() => {
                if (blocker.state === 'blocked') {
                  blocker.proceed();
                }
              }}
            >
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
    </Page>
  );
}
function CreationRecovery({
  name,
  onUse,
  onClose,
  onRetry,
}: {
  name: string;
  onUse: (recipe: Recipe) => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const query = useRecipes(name.trim());
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Check saved recipes</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>
          Check whether the interrupted save created your recipe. Opening one replaces this draft with its saved
          details.
        </p>
        <InfiniteList
          query={query}
          label="matching recipes"
          singular="matching recipe"
          empty={<p>No matching recipes found.</p>}
        >
          {(recipe) => (
            <div className="space-y-2 p-4">
              <p className="break-words font-semibold">{recipe.name}</p>
              <p className="text-sm text-muted-foreground">Makes {recipe.servings_count} servings</p>
              <Button
                variant="outline"
                onPress={() => onUse(recipe)}
              >
                Open saved recipe
              </Button>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isFetching && !query.hasNextPage && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If none matches this attempt, return to your draft and create a separate recipe.
            </p>
            <Button
              variant="outline"
              onPress={onRetry}
            >
              Create a separate recipe
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          onPress={onClose}
        >
          Return to draft
        </Button>
      </div>
    </Dialog>
  );
}
