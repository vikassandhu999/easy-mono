defmodule Easy.Trackers.Tracker do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}
  schema "trackers" do
    field :business_id, :binary_id
    field :name, :string
    field :kind, Ecto.Enum, values: [:number, :rating, :yes_no, :text, :photo, :document]
    field :base_unit, :string
    field :scale_max, :integer
    field :archived_at, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:name, :kind, :base_unit, :scale_max])
    |> put_change(:business_id, business_id)
    |> validate_required([:name, :kind])
    |> validate_length(:name, max: 120)
    |> validate_shape()
    |> check_constraint(:kind, name: :trackers_shape)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:name, :kind, :base_unit, :scale_max])
    |> validate_required([:name])
    |> validate_length(:name, max: 120)
    |> immutable()
    |> check_constraint(:kind, name: :trackers_fixed_definition)
  end

  defp immutable(cs) do
    Enum.reduce([:kind, :base_unit, :scale_max], cs, fn key, acc ->
      if Map.has_key?(acc.changes, key), do: add_error(acc, key, "is fixed at creation"), else: acc
    end)
  end

  defp validate_shape(cs) do
    case get_field(cs, :kind) do
      :number -> cs |> validate_required([:base_unit]) |> validate_length(:base_unit, max: 40) |> absent([:scale_max])
      :rating -> rating_shape(cs)
      _ -> absent(cs, [:base_unit, :scale_max])
    end
  end

  defp rating_shape(cs) do
    cs
    |> validate_required([:scale_max])
    |> validate_number(:scale_max, greater_than_or_equal_to: 2, less_than_or_equal_to: 10)
    |> absent([:base_unit])
  end

  defp absent(cs, keys) do
    Enum.reduce(keys, cs, fn key, acc ->
      if is_nil(get_field(acc, key)), do: acc, else: add_error(acc, key, "does not apply to this kind")
    end)
  end

  @spec visible(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def visible(query \\ __MODULE__, business_id), do: from(t in query, where: is_nil(t.business_id) or t.business_id == ^business_id)
end
