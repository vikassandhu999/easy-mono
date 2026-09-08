defmodule Easy.Nutrition.DiarySlot.Item do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.{NutrientTotals, Portions}

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :portion, Portions
    field :nutrients, NutrientTotals
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(item, attrs) do
    item |> cast(attrs, [:id, :name, :food_id, :recipe_id, :portion, :nutrients]) |> validate_snapshot()
  end

  @spec validate_snapshot(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_snapshot(changeset) do
    changeset = validate_required(changeset, [:id, :name, :portion, :nutrients])

    case {get_field(changeset, :food_id), get_field(changeset, :recipe_id)} do
      {id, nil} when is_binary(id) -> changeset
      {nil, id} when is_binary(id) -> changeset
      _ -> add_error(changeset, :food_id, "must supply exactly one Library reference")
    end
  end
end

defmodule Easy.Nutrition.DiarySlot.Entry do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.Item
  alias Easy.Nutrition.{NutrientTotals, Portions}

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    field :food_id, Ecto.UUID
    field :recipe_id, Ecto.UUID
    field :portion, Portions
    field :nutrients, NutrientTotals
    field :planned_item_ref, Ecto.UUID
    field :notes, :string
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:id, :name, :food_id, :recipe_id, :portion, :nutrients, :planned_item_ref, :notes])
    |> Item.validate_snapshot()
    |> validate_length(:notes, max: 255)
  end
end

defmodule Easy.Nutrition.DiarySlot.Option do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.Item

  @primary_key {:id, Ecto.UUID, autogenerate: false}
  @type t :: %__MODULE__{}
  embedded_schema do
    field :name, :string
    embeds_many :items, Item, on_replace: :delete
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(option, attrs) do
    option |> cast(attrs, [:id, :name]) |> validate_required([:id, :name]) |> cast_embed(:items)
  end
end

defmodule Easy.Nutrition.DiarySlot.Document do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Nutrition.DiarySlot.{Entry, Item, Option}

  @primary_key false
  @type t :: %__MODULE__{}
  embedded_schema do
    field :meal_id, Ecto.UUID
    embeds_many :options, Option, on_replace: :delete
    embeds_many :entries, Entry, on_replace: :delete
  end

  @spec from_meals([map()]) :: t()
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

  @spec entry_source(t(), String.t() | nil, map()) ::
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

defmodule Easy.Nutrition.DiarySlot do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Clients.Client
  alias Easy.Nutrition.{DiaryDay, MealSlot}
  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Orgs.Business

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "nutrition_diary_slots" do
    field :local_date, :date
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :applied_timezone, :string
    field :has_coverage, :boolean
    field :revision, :integer, default: 0
    belongs_to :day, DiaryDay, foreign_key: :nutrition_diary_day_id
    belongs_to :business, Business
    belongs_to :client, Client
    embeds_one :document, Document, on_replace: :delete
    timestamps(type: :utc_datetime)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(slot, document_attrs) do
    slot
    |> change(revision: slot.revision + 1)
    |> put_embed(:document, Document.changeset(slot.document || %Document{}, document_attrs))
    |> validate_required([
      :local_date,
      :meal_slot,
      :applied_timezone,
      :has_coverage,
      :nutrition_diary_day_id,
      :business_id,
      :client_id
    ])
    |> unique_constraint([:business_id, :client_id, :local_date, :meal_slot],
      name: :nutrition_diary_slots_identity_index
    )
    |> check_constraint(:document, name: :nutrition_diary_slots_document_check)
    |> foreign_key_constraint(:nutrition_diary_day_id, name: :nutrition_diary_slots_day_identity_fkey)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(slot in query, where: slot.business_id == ^business_id and slot.client_id == ^client_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date), do: from(slot in query, where: slot.local_date == ^date)
end
