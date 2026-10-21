import {useCallback, useEffect, useRef, useState} from 'react';
import {flushSync} from 'react-dom';
import {Controller, useForm} from 'react-hook-form';
import {generatePath, useBeforeUnload, useBlocker, useNavigate, useParams} from 'react-router-dom';
import {ApiError, errorMessage} from '../api/client';
import {type Food, useFood, useFoods, useNutrients, useSaveFood} from '../api/foods';
import {routes} from '../routes';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormError} from '../ui/form-error';
import {setFormError} from '../ui/form-errors';
import {FormField} from '../ui/form-field';
import {InfiniteList} from '../ui/infinite-list';
import {useListLocation} from '../ui/list-location';
import {FormActions, Page, PageHeader, Surface} from '../ui/page';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {basisLabel, body, type FoodFields, fields} from './food';
import {FoodServings} from './food-servings';

export function FoodEditor() {
  const {id} = useParams();
  return id ? (
    <LoadEditor
      key={id}
      id={id}
    />
  ) : (
    <Editor key="new" />
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
  return initial ? (
    <Editor initial={initial} />
  ) : (
    <Page className="editor-page">
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
function Editor({initial}: {initial?: Food}) {
  const form = useForm<FoodFields>({defaultValues: fields(initial), mode: 'onBlur'});
  const save = useSaveFood();
  const nutrients = useNutrients();
  const saved = useFood(initial?.id ?? '');
  const [notice, setNotice] = useState('');
  const [savedVersion, setSavedVersion] = useState(0);
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reload, setReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const leaving = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const {to, state} = useListLocation(routes.foods);
  const dirty = form.formState.isDirty;
  const pending = form.formState.isSubmitting || reloading;
  const basis = form.watch('basis');
  const unitLabel = form.watch('unit_label');
  const knownNutrients = nutrients.data?.data ?? [];
  const blocker = useBlocker(
    useCallback(
      ({currentLocation, nextLocation}) =>
        !leaving.current && (dirty || pending || uncertain) && currentLocation.pathname !== nextLocation.pathname,
      [dirty, pending, uncertain],
    ),
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || pending || uncertain) {
          event.preventDefault();
          event.returnValue = '';
        }
      },
      [dirty, pending, uncertain],
    ),
  );
  useEffect(() => {
    if (form.formState.errors.root) {
      errorRef.current?.focus();
    }
  }, [form.formState.errors.root]);
  return (
    <Page className="editor-page">
      <PageHeader
        title={initial ? 'Edit food' : 'Create food'}
        description="Enter known values from a food label or a reliable source. Catalogue changes apply from now on."
        back={{to, label: 'Back to foods', state}}
      />
      <form
        noValidate
        className="has-mobile-actions min-w-0 space-y-6"
        onChange={() => setNotice('')}
        onSubmit={form.handleSubmit(async (values) => {
          if (pending || uncertain || !nutrients.data) {
            return;
          }
          form.clearErrors();
          setNotice('');
          try {
            const input = body(values);
            const result = await save.mutateAsync(
              initial ? {kind: 'update', id: initial.id, body: input} : {kind: 'create', body: input},
            );
            form.reset(fields(result.data));
            setSavedVersion((version) => version + 1);
            setNotice('Food saved.');
            if (!initial) {
              leaving.current = true;
              navigate(generatePath(routes.food, {id: result.data.id}), {replace: true, state});
            }
          } catch (error) {
            const unknownCreate = !initial && (!(error instanceof ApiError) || error.status >= 500);
            setUncertain(unknownCreate);
            setFormError(
              error,
              unknownCreate
                ? 'Creation could not be confirmed. Check saved foods before trying again. Your draft is still here.'
                : 'Could not confirm this save. Your edits are still here. Review the saved food before trying again.',
              form.setError,
              ['name', 'kind', 'basis', 'unit_label', 'nutrients', 'servings'],
            );
          }
        })}
      >
        <fieldset
          disabled={pending || uncertain}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">Food information</legend>
          <FormField
            control={form.control}
            name="name"
            label="Food name"
            emphasis="title"
            isRequired
            maxLength={255}
            rules={{validate: (value) => Boolean(String(value ?? '').trim()) || 'Enter a food name.'}}
          />
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="kind"
              render={({field, fieldState}) => (
                <div className="grid gap-2">
                  <label
                    id="editor-food-kind-label"
                    htmlFor="editor-food-kind"
                    className="text-sm font-medium"
                  >
                    Kind
                  </label>
                  <SelectField
                    id="editor-food-kind"
                    value={field.value}
                    onChange={field.onChange}
                    triggerRef={field.ref}
                    onBlur={field.onBlur}
                    isDisabled={pending || uncertain}
                    isInvalid={Boolean(fieldState.error)}
                    aria-describedby="editor-food-kind-error"
                  >
                    <SelectItem id="food">Food</SelectItem>
                    <SelectItem id="supplement">Supplement</SelectItem>
                  </SelectField>
                  <div id="editor-food-kind-error">
                    <FormError message={fieldState.error?.message} />
                  </div>
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="basis"
              render={({field, fieldState}) => (
                <div className="grid gap-2">
                  <label
                    id="editor-food-basis-label"
                    htmlFor="editor-food-basis"
                    className="text-sm font-medium"
                  >
                    Nutrient values per
                  </label>
                  <SelectField
                    id="editor-food-basis"
                    value={field.value}
                    onChange={field.onChange}
                    triggerRef={field.ref}
                    onBlur={field.onBlur}
                    isDisabled={pending || uncertain}
                    isInvalid={Boolean(fieldState.error)}
                    aria-describedby="editor-food-basis-error"
                  >
                    <SelectItem id="100g">100 g</SelectItem>
                    <SelectItem id="100ml">100 ml</SelectItem>
                    <SelectItem id="1unit">1 unit</SelectItem>
                  </SelectField>
                  <div id="editor-food-basis-error">
                    <FormError message={fieldState.error?.message} />
                  </div>
                </div>
              )}
            />
          </div>
          {basis === '1unit' && (
            <FormField
              control={form.control}
              name="unit_label"
              label="Unit name"
              isRequired
              maxLength={80}
              description="For example, capsule or tablet. Serving amounts count these units."
              rules={{validate: (value) => Boolean(String(value ?? '').trim()) || 'Enter a unit name.'}}
            />
          )}
          <section className="editor-section space-y-4">
            <div>
              <h2 className="editor-section-title">Nutrients per {basisLabel({basis, unit_label: unitLabel})}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Leave an unknown value blank. Enter 0 only when it is known to be zero.
              </p>
            </div>
            {!nutrients.data && !nutrients.isError && <p role="status">Loading nutrients…</p>}
            {nutrients.isError && (
              <div className="space-y-3">
                <FormError message="Could not load nutrients. Your draft is still here." />
                <Button
                  variant="outline"
                  isPending={nutrients.isFetching}
                  onPress={() => {
                    nutrients.refetch();
                  }}
                >
                  Retry nutrients
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {knownNutrients.map((nutrient) => (
                <FormField
                  key={nutrient.code}
                  control={form.control}
                  name={`nutrients.${nutrient.code}`}
                  label={`${nutrient.name} · ${nutrient.unit}`}
                  inputMode="decimal"
                  rules={{
                    validate: (value) =>
                      !String(value ?? '').trim() ||
                      (Number.isFinite(Number(value)) && Number(value) >= 0) ||
                      'Enter zero or a positive number.',
                  }}
                />
              ))}
            </div>
            <FormError
              message={
                typeof form.formState.errors.nutrients?.message === 'string'
                  ? form.formState.errors.nutrients.message
                  : undefined
              }
            />
          </section>
          <FoodServings
            key={savedVersion}
            form={form}
            isDisabled={pending || uncertain}
          />
          <FormError message={form.formState.errors.servings?.message} />
        </fieldset>
        <FormError
          ref={errorRef}
          tabIndex={-1}
          message={form.formState.errors.root?.message}
        />
        {form.formState.errors.root && initial && (
          <Button
            variant="outline"
            isDisabled={pending}
            onPress={() => setReload(true)}
          >
            Review saved food
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
        {notice && !dirty && <p role="status">{notice}</p>}
        <p
          role="status"
          className="text-xs text-muted-foreground"
        >
          {dirty ? 'Unsaved changes' : initial ? 'All changes saved' : 'New food'}
        </p>
        <FormActions>
          <Button
            variant="ghost"
            isDisabled={pending}
            onPress={() => navigate(to, {state})}
          >
            Back to foods
          </Button>
          <Button
            type="submit"
            isPending={pending}
            isDisabled={!dirty || uncertain || !nutrients.data}
          >
            Save food
          </Button>
        </FormActions>
      </form>
      {checking && (
        <CreationRecovery
          name={form.getValues('name')}
          onClose={() => setChecking(false)}
          onUse={(food) => {
            leaving.current = true;
            navigate(generatePath(routes.food, {id: food.id}), {replace: true, state});
          }}
          onRetry={() => {
            flushSync(() => {
              setChecking(false);
              setUncertain(false);
              form.clearErrors('root');
            });
            form.setFocus('name');
          }}
        />
      )}
      <Dialog
        isOpen={reload}
        isDismissable={!reloading}
        showCloseButton={!reloading}
        isKeyboardDismissDisabled={reloading}
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
                  const result = await saved.refetch();
                  if (result.error) {
                    throw result.error;
                  }
                  if (result.data) {
                    form.reset(fields(result.data.data));
                    setSavedVersion((version) => version + 1);
                    setReload(false);
                    setNotice('Saved food loaded.');
                  }
                } catch (error) {
                  setReload(false);
                  form.setError('root', {
                    message: errorMessage(error, 'Could not load the saved food. Your edits are still here.'),
                  });
                } finally {
                  setReloading(false);
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
        isDismissable={false}
        isKeyboardDismissDisabled
        showCloseButton={false}
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
              Discard and leave
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
  const query = useFoods({search: name.trim()});
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
        <p>Check whether the interrupted save created your food. Opening one replaces this draft.</p>
        <InfiniteList
          query={query}
          label="matching foods"
          singular="matching food"
          empty={<p>No matching foods found.</p>}
        >
          {(food) => (
            <div className="space-y-2 p-4">
              <p className="break-words font-semibold">{food.name}</p>
              <p className="text-sm text-muted-foreground">Per {basisLabel(food)}</p>
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
