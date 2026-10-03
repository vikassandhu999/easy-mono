defmodule Easy.CoachingTerms.CoachingTerm do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "coaching_terms" do
    belongs_to :client, Easy.Clients.Client
    field :starts_on, :date
    field :ends_on, :date
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), Date.t()) :: Ecto.Changeset.t()
  def insert_changeset(client_id, today) do
    %__MODULE__{} |> change(client_id: client_id, starts_on: today) |> validate_constraints()
  end

  @spec update_changeset(t(), Date.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(term, today, attrs) do
    term
    |> cast(attrs, [:ends_on])
    |> validate_change(:ends_on, fn :ends_on, date ->
      if Date.compare(date, today) == :lt or Date.compare(date, term.starts_on) == :lt, do: [ends_on: "must be today or later and on or after the start"], else: []
    end)
    |> validate_constraints()
  end

  defp validate_constraints(changeset) do
    changeset
    |> validate_required([:client_id, :starts_on])
    |> foreign_key_constraint(:client_id)
    |> check_constraint(:ends_on, name: :coaching_terms_dates_check)
    |> exclusion_constraint(:starts_on, name: :coaching_terms_no_overlap)
  end

  @spec covers?(t(), Date.t()) :: boolean()
  def covers?(term, date), do: Date.compare(term.starts_on, date) != :gt and (is_nil(term.ends_on) or Date.compare(term.ends_on, date) != :lt)
  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: from(t in query, join: c in assoc(t, :client), where: c.business_id == ^business_id)
end
