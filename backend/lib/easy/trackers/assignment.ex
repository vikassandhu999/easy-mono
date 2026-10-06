defmodule Easy.Trackers.Assignment do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "tracker_assignments" do
    field :business_id, :binary_id
    field :client_id, :binary_id
    belongs_to :tracker, Easy.Trackers.Tracker
    field :timing, Ecto.Enum, values: [:daily, :weekly, :after_workout, :after_meal]
    field :weekday, :integer
    field :starts_on, :date
    field :ends_on, :date
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), Date.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, tracker_id, date, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:timing, :weekday])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:tracker_id, tracker_id)
    |> put_change(:starts_on, date)
    |> validate_required([:timing])
    |> validate_timing()
    |> exclusion_constraint(:starts_on, name: :tracker_assignments_no_overlap)
    |> check_constraint(:weekday, name: :tracker_assignments_weekday)
    |> foreign_key_constraint(:tracker_id, name: :tracker_tenant_reference)
  end

  defp validate_timing(cs) do
    if get_field(cs, :timing) == :weekly do
      cs
      |> validate_required([:weekday])
      |> validate_number(:weekday, greater_than_or_equal_to: 0, less_than_or_equal_to: 6)
    else
      if is_nil(get_field(cs, :weekday)), do: cs, else: add_error(cs, :weekday, "only applies to weekly timing")
    end
  end
end
