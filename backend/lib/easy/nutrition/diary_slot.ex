defmodule Easy.Nutrition.DiarySlot do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.{DiaryEntry, DiaryFrozenOption, MealSlot}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_slots" do
    field :local_date, :date
    field :meal_slot, Ecto.Enum, values: MealSlot.values()
    field :applied_timezone, :string
    field :has_coverage, :boolean
    field :revision, :integer, default: 1
    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :active_frozen_option, DiaryFrozenOption, foreign_key: :active_frozen_option_id
    has_many :frozen_options, DiaryFrozenOption, foreign_key: :nutrition_diary_slot_id
    has_many :entries, DiaryEntry, foreign_key: :nutrition_diary_slot_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :local_date,
      :meal_slot,
      :applied_timezone,
      :has_coverage,
      :revision,
      :target_calories,
      :target_protein_g,
      :target_carbs_g,
      :target_fat_g,
      :target_fiber_g
    ])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> validate_required([:local_date, :meal_slot, :applied_timezone, :has_coverage, :revision, :business_id, :client_id])
    |> validate_number(:revision, greater_than: 0)
    |> unique_constraint([:client_id, :local_date, :meal_slot], name: :nutrition_diary_slots_identity_index)
    |> check_constraint(:meal_slot, name: :nutrition_diary_slots_meal_slot_check)
    |> foreign_key_constraint(:client_id, name: :nutrition_diary_slots_client_business_id_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(slot, attrs) do
    slot
    |> cast(attrs, [:revision, :active_frozen_option_id])
    |> validate_required([:revision])
    |> validate_number(:revision, greater_than: 0)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(slot in query, where: slot.business_id == ^business_id and slot.client_id == ^client_id)
  end

  @spec for_date(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def for_date(query \\ __MODULE__, date), do: from(slot in query, where: slot.local_date == ^date)

  @spec lock_identity(Ecto.Queryable.t(), String.t(), String.t(), Date.t(), atom()) :: Ecto.Query.t()
  def lock_identity(query \\ __MODULE__, business_id, client_id, date, meal_slot) do
    from(slot in query,
      where:
        slot.business_id == ^business_id and slot.client_id == ^client_id and slot.local_date == ^date and
          slot.meal_slot == ^meal_slot,
      lock: "FOR UPDATE"
    )
  end

  @spec include_frozen(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_frozen(query \\ __MODULE__, business_id) do
    item_query =
      from(item in Easy.Nutrition.DiaryFrozenPlannedItem,
        where: item.business_id == ^business_id,
        order_by: [asc: item.position, asc: item.id]
      )

    option_query =
      from(option in DiaryFrozenOption,
        where: option.business_id == ^business_id,
        order_by: [asc: option.position, asc: option.id],
        preload: [planned_items: ^item_query]
      )

    entry_query =
      from(entry in DiaryEntry,
        where: entry.business_id == ^business_id,
        order_by: [asc: entry.inserted_at, asc: entry.id]
      )

    from(slot in query,
      where: slot.business_id == ^business_id,
      preload: [frozen_options: ^option_query, entries: ^entry_query]
    )
  end
end
