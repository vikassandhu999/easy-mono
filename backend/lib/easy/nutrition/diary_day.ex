defmodule Easy.Nutrition.DiaryDay do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Nutrition.{Day, Plan}

  @target_fields [:target_calories, :target_protein_g, :target_carbs_g, :target_fat_g, :target_fiber_g]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t() :: %__MODULE__{}
  @type target_attrs() :: %{
          optional(:target_calories) => number() | nil,
          optional(:target_protein_g) => number() | nil,
          optional(:target_carbs_g) => number() | nil,
          optional(:target_fat_g) => number() | nil,
          optional(:target_fiber_g) => number() | nil
        }

  schema "nutrition_diary_days" do
    field :local_date, :date
    field :target_calories, :float
    field :target_protein_g, :float
    field :target_carbs_g, :float
    field :target_fat_g, :float
    field :target_fiber_g, :float
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), Date.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, date, attrs) do
    %__MODULE__{}
    |> cast(attrs, @target_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:local_date, date)
    |> validate_required([:business_id, :client_id, :local_date])
    |> validate_targets()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:client_id, name: :nutrition_diary_days_client_business_fkey)
    |> unique_constraint([:business_id, :client_id, :local_date])
    |> check_constraint(:target_calories, name: :nutrition_diary_days_targets_check)
  end

  defp validate_targets(changeset) do
    Enum.reduce(@target_fields, changeset, fn field, changeset ->
      validate_number(changeset, field, greater_than_or_equal_to: 0)
    end)
  end

  @spec for_date(String.t(), String.t(), Date.t()) :: Ecto.Query.t()
  def for_date(business_id, client_id, date) do
    from(day in __MODULE__,
      where: day.business_id == ^business_id and day.client_id == ^client_id,
      where: day.local_date == ^date
    )
  end

  @spec target_attrs(Plan.t() | nil) :: target_attrs()
  def target_attrs(nil), do: %{}
  def target_attrs(plan), do: Map.take(plan, @target_fields)

  @spec targets(map() | nil) :: Day.targets()
  def targets(nil), do: %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}

  def targets(day) do
    %{
      calories: day.target_calories,
      protein_g: day.target_protein_g,
      carbs_g: day.target_carbs_g,
      fat_g: day.target_fat_g,
      fiber_g: day.target_fiber_g
    }
  end
end
