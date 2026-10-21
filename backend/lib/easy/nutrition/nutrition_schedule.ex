defmodule Easy.Nutrition.NutritionSchedule do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Nutrition.Timing
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "nutrition_schedules" do
    field :date, :date
    field :weekdays_mask, :integer
    field :from_date, :date
    field :until_date, :date
    field :time, :time
    belongs_to :coach, Easy.Orgs.Coach
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :nutrition_preset, Easy.Nutrition.NutritionPreset
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, parent_id, attrs) do
    %__MODULE__{}
    |> change()
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:nutrition_preset_id, parent_id)
    |> update_changeset(attrs)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:date, :weekdays_mask, :from_date, :until_date, :time])
      |> validate_required([:business_id, :client_id, :nutrition_preset_id])
      |> Timing.validate(:nutrition_schedules_timing)
      |> foreign_key_constraint(:nutrition_preset_id,
        name: :nutrition_schedules_nutrition_preset_id_client_id_business_id_fkey
      )

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)

  @spec current(Ecto.Queryable.t(), Date.t()) :: Ecto.Query.t()
  def current(query \\ __MODULE__, today),
    do:
      from(s in query,
        where:
          (not is_nil(s.date) and s.date >= ^today) or
            (is_nil(s.date) and (is_nil(s.until_date) or s.until_date >= ^today))
      )

  @spec by_time(Ecto.Queryable.t()) :: Ecto.Query.t()
  def by_time(query \\ __MODULE__), do: from(s in query, order_by: [asc_nulls_last: s.time, asc: s.id])
end
