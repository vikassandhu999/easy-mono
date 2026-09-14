import {useCallback, useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Food, useFood, useFoods, useSaveFood} from '../api/foods';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {NutritionTags} from '../ui/nutrition-tags';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {body, fields} from './food';
import {FoodMedia} from './food-media';
import {FoodServings} from './food-servings';

const nutrients = [
  ['calories_per_100g', 'Calories · kcal'],
  ['protein_g_per_100g', 'Protein · g'],
  ['carbs_g_per_100g', 'Carbs · g'],
  ['fat_g_per_100g', 'Fat · g'],
  ['fiber_g_per_100g', 'Fiber · g'],
  ['sugar_g_per_100g', 'Sugar · g'],
] as const;
export function FoodEditor() {
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
  const query = useFood(id);
  const [initial, setInitial] = useState<Food>();
  const {to, state} = useListLocation(routes.foods);
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
        title="Food"
        back={{to, label: 'Back to foods', state}}
      />
      <Surface>
        {query.isError ? (
          <div className="space-y-3">
            <FormError message={errorMessage(query.error, 'Could not load this food.')} />
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
          <p role="status">Loading food…</p>
        )}
      </Surface>
    </Page>
  );
}
function Editor({initial}: {initial: Food | undefined}) {
  const [food, setFood] = useState(initial);
  const form = useForm({defaultValues: fields(initial)});
  const save = useSaveFood();
  const query = useFood(food?.id ?? '');
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reload, setReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const mounted = useRef(true);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {to, state} = useListLocation(routes.foods);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || reloading || uploading;
  const readOnly = food?.source === 'system';
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
  function resetFood(saved: Food) {
    setFood(saved);
    form.reset(fields(saved));
    setConflict(false);
    setUncertain(false);
    setChecking(false);
  }
  return (
    <Page>
      <PageHeader
        title={initial ? (readOnly ? 'Food details' : 'Edit food') : 'Create food'}
        description={
          initial
            ? readOnly
              ? 'This shared food is read-only.'
              : 'Changes update this library food wherever it is used in plans and recipes.'
            : 'Enter the values from a reliable food label or source.'
        }
        back={{to, label: 'Back to foods', state}}
        actions={
          food && (
            <Button
              variant="outline"
              isDisabled={pending || conflict || uncertain}
              onPress={() => navigate(generatePath(routes.manageFood, {id: food.id}), {state})}
            >
              Manage food
            </Button>
          )
        }
      />
      <form
        noValidate
        className="has-mobile-actions min-w-0 space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          if (readOnly || conflict || uncertain || pending) {
            return;
          }
          form.clearErrors();
          setNotice('');
          try {
            const input = body(values, food);
            const result = await save.mutateAsync(
              food
                ? {kind: 'update', id: food.id, body: {...input, expected_revision: food.revision}}
                : {kind: 'create', body: input},
            );
            if (!mounted.current) {
              return;
            }
            resetFood(result.data);
            setNotice('Food saved.');
            if (!initial) {
              leaving.current = true;
              navigate(generatePath(routes.food, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            if (!mounted.current) {
              return;
            }
            const stale = error instanceof ApiError && error.code === 'stale_revision';
            setConflict(stale);
            const unknownCreate = !food && (!(error instanceof ApiError) || error.status >= 500);
            setUncertain(unknownCreate);
            form.setError('root', {
              message: stale
                ? 'This food changed elsewhere. Your edits are still here. Load the saved version before editing again.'
                : unknownCreate
                  ? 'Creation could not be confirmed. Check saved foods before trying again; your draft is still here.'
                  : error instanceof ApiError && error.code === 'in_use'
                    ? 'A recipe or plan uses a serving you removed or renamed. Keep that serving, or update its uses from Manage food before changing it.'
                    : errorMessage(
                        error,
                        'The save could not be confirmed. Your edits are still here. Check the saved version before retrying.',
                      ),
            });
          }
        })}
      >
        <fieldset
          disabled={pending || readOnly}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">Food information</legend>
          <FormField
            control={form.control}
            name="name"
            label="Food name"
            isRequired
            maxLength={255}
            rules={{validate: (value) => Boolean(String(value).trim()) || 'Enter a food name.'}}
          />
          <section
            className="space-y-4"
            aria-label="Nutrition per 100 grams"
          >
            <div>
              <h2 className="text-xl font-bold">Nutrition per 100 g</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use per-100-g values, not per-serving values. Leave unknown values blank; enter 0 only when known.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {nutrients.map(([name, label]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  label={label}
                  inputMode="decimal"
                  rules={{
                    validate: (value) =>
                      !String(value).trim() ||
                      (Number.isFinite(Number(value)) && Number(value) >= 0) ||
                      'Enter zero or a positive number.',
                  }}
                />
              ))}
            </div>
          </section>
          <FoodServings
            key={food?.revision ?? 'new'}
            form={form}
            isDisabled={pending || readOnly}
          />
          <details>
            <summary className="w-fit cursor-pointer py-2 font-medium">Brand, allergens and other details</summary>
            <div className="mt-3 space-y-4">
              <FormField
                control={form.control}
                name="brand"
                label="Brand"
                maxLength={255}
              />
              <FormField
                control={form.control}
                name="category"
                label="Category"
                maxLength={255}
              />
              <NutritionTags
                value={{allergens: form.watch('allergens'), dietary_tags: form.watch('dietary_tags')}}
                isDisabled={pending || readOnly}
                onChange={(field, values) => form.setValue(field, values, {shouldDirty: true})}
              />
              <FormField
                control={form.control}
                name="notes"
                label="Notes"
                multiline
                maxLength={5000}
              />
            </div>
          </details>
        </fieldset>
        <FoodMedia
          key={food?.revision ?? 'new'}
          media={form.watch('media')}
          disabled={pending || readOnly}
          readOnly={readOnly}
          onBusy={setUploading}
          onChange={(media) => form.setValue('media', media, {shouldDirty: true})}
        />
        <div
          ref={errorRef}
          tabIndex={-1}
          className="space-y-3"
        >
          <FormError message={form.formState.errors.root?.message} />
          {form.formState.errors.root && food && (
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
              Check saved foods
            </Button>
          )}
        </div>
        {notice && !dirty && <p role="status">{notice}</p>}
        {!readOnly && (
          <p
            role="status"
            className="text-xs text-muted-foreground"
          >
            {dirty ? 'Unsaved changes' : food ? 'All changes saved' : 'New food'}
          </p>
        )}
        <FormActions>
          <Button
            variant="ghost"
            isDisabled={pending}
            onPress={() => navigate(to, {state})}
          >
            Back to foods
          </Button>
          {!readOnly && (
            <Button
              type="submit"
              isPending={pending}
              isDisabled={!dirty || conflict || uncertain}
            >
              Save food
            </Button>
          )}
        </FormActions>
      </form>
      {checking && (
        <CreationRecovery
          name={form.getValues('name')}
          onClose={() => setChecking(false)}
          onUse={(saved) => {
            leaving.current = true;
            navigate(generatePath(routes.food, {id: saved.id}), {replace: true, state});
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
          <DialogTitle>Load saved food?</DialogTitle>
        </DialogHeader>
        <div className="dialog-body space-y-4">
          <p>This replaces your unsaved edits with the saved food.</p>
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
                    resetFood(result.data.data);
                    setReload(false);
                    setNotice('Saved version loaded.');
                  }
                } catch (error) {
                  if (mounted.current) {
                    setReload(false);
                    form.setError('root', {
                      message: errorMessage(error, 'Could not load the saved food. Your edits are still here.'),
                    });
                  }
                } finally {
                  if (mounted.current) {
                    setReloading(false);
                  }
                }
              }}
            >
              Load saved food
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
  onUse: (food: Food) => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const query = useFoods(name.trim());
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
        <DialogTitle>Check saved foods</DialogTitle>
      </DialogHeader>
      <div className="dialog-body space-y-4">
        <p>
          Check whether the interrupted save created your food. Opening one replaces this draft with its saved details.
        </p>
        <InfiniteList
          query={query}
          label="matching foods"
          singular="matching food"
          empty={<p>No matching foods found.</p>}
        >
          {(food) => (
            <div className="space-y-2 p-4">
              <p className="break-words font-semibold">{food.name}</p>
              {food.brand && <p className="text-sm">{food.brand}</p>}
              <p className="text-sm text-muted-foreground">
                {food.calories_per_100g === null ? 'Calories unknown' : `${food.calories_per_100g} kcal per 100 g`}
              </p>
              <Button
                variant="outline"
                onPress={() => onUse(food)}
              >
                Open saved food
              </Button>
            </div>
          )}
        </InfiniteList>
        {query.isSuccess && !query.isFetching && !query.hasNextPage && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If none matches this attempt, return to your draft and create a separate food.
            </p>
            <Button
              variant="outline"
              onPress={onRetry}
            >
              Create a separate food
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
