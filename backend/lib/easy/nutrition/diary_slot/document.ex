defmodule Easy.Nutrition.DiarySlot.Document do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.{Entry, Item, Option}
  alias Easy.Nutrition.Menu.Meal

  @primary_key false
  @type t :: %__MODULE__{}
  @type entry_reference :: %{
          required(:id) => String.t(),
          required(:planned_item_ref) => String.t() | nil,
          optional(atom()) => term()
        }
  embedded_schema do
    field :meal_id, Ecto.UUID
    embeds_many :options, Option, on_replace: :delete
    embeds_many :entries, Entry, on_replace: :delete
  end

  @spec from_meals([Meal.t()]) :: t()
  def from_meals(meals) do
    options =
      Enum.map(meals, fn meal ->
        items = Enum.map(meal.meal_items, &struct!(Item, Map.take(&1, [:id, :name, :food_id, :recipe_id, :portion, :nutrients])))
        %Option{id: meal.id, name: meal.name, items: items}
      end)

    first = List.first(options)
    %__MODULE__{meal_id: first && first.id, options: options}
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(document, attrs) do
    document
    |> cast(attrs, [:meal_id])
    |> cast_embed(:options)
    |> cast_embed(:entries)
    |> validate_references()
  end

  @spec active_option(t()) :: Option.t() | nil
  def active_option(document), do: Enum.find(document.options, &(&1.id == document.meal_id))

  defp planned_items(document), do: Enum.flat_map(document.options, & &1.items)

  @spec items(t()) :: [Item.t() | Entry.t()]
  def items(document), do: planned_items(document) ++ document.entries

  @spec entry_source(t(), String.t() | nil, entry_reference()) ::
          {:ok, Item.t() | Entry.t() | nil, String.t() | nil} | {:error, :not_found}
  def entry_source(document, meal_id, command) do
    existing = Enum.find(document.entries, &(&1.id == command.id))

    with {:ok, planned} <- planned_for_entry(document, meal_id, existing, command.planned_item_ref) do
      {:ok, existing || planned, planned && planned.id}
    end
  end

  defp planned_for_entry(_document, _meal_id, %Entry{planned_item_ref: nil}, nil), do: {:ok, nil}

  defp planned_for_entry(document, _meal_id, %Entry{} = entry, ref) do
    planned = Enum.find(planned_items(document), &(&1.id == entry.planned_item_ref))
    if planned && (is_nil(ref) || planned.id == ref), do: {:ok, planned}, else: {:error, :not_found}
  end

  defp planned_for_entry(_document, _meal_id, nil, nil), do: {:ok, nil}

  defp planned_for_entry(document, meal_id, nil, ref) do
    active = Enum.find(document.options, &(&1.id == meal_id))
    planned = active && Enum.find(active.items, &(&1.id == ref))
    if planned, do: {:ok, planned}, else: {:error, :not_found}
  end

  defp validate_references(%{valid?: false} = changeset), do: changeset

  defp validate_references(changeset) do
    document = apply_changes(changeset)
    refs = MapSet.new(planned_items(document), & &1.id)
    used = Enum.flat_map(document.entries, &List.wrap(&1.planned_item_ref))
    selected? = if document.options == [], do: is_nil(document.meal_id), else: not is_nil(active_option(document))

    cond do
      not selected? -> add_error(changeset, :meal_id, "must select an offered meal")
      length(used) != MapSet.size(MapSet.new(used)) -> add_error(changeset, :entries, "repeats a planned reference")
      not Enum.all?(used, &MapSet.member?(refs, &1)) -> add_error(changeset, :entries, "references an item outside this slot")
      true -> changeset
    end
  end
end
