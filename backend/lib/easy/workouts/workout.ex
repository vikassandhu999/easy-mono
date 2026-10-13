defmodule Easy.Workouts.Workout do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "workouts" do
    field :name, :string
    field :description, :string
    field :type, Ecto.Enum, values: [:prescribed, :video, :open], default: :prescribed
    field :video, :string
    field :archived_at, :utc_datetime
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    has_many :groups, Easy.Workouts.ExerciseGroup, preload_order: [asc: :position, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs),
    do: %__MODULE__{} |> change(business_id: business_id, client_id: client_id) |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:name, :description, :type, :video])
      |> update_change(:name, &String.trim/1)
      |> validate_required([:business_id, :name, :type])
      |> validate_length(:name, max: 200)
      |> validate_video()
      |> check_constraint(:video, name: :workouts_video)
      |> foreign_key_constraint(:client_id, name: :workouts_client_id_business_id_fkey)

  defp validate_video(cs) do
    if get_field(cs, :type) == :video do
      cs |> validate_required([:video]) |> validate_format(:video, ~r/^https?:\/\/[^\s]+$/)
    else
      if get_field(cs, :video), do: add_error(cs, :video, "only a video workout has a video"), else: cs
    end
  end

  @spec for_owner(Ecto.Queryable.t(), String.t(), String.t() | nil) :: Ecto.Query.t()
  def for_owner(query \\ __MODULE__, business_id, client_id)

  def for_owner(query, business_id, nil),
    do: from(w in query, where: w.business_id == ^business_id and is_nil(w.client_id))

  def for_owner(query, business_id, client_id),
    do: from(w in query, where: w.business_id == ^business_id and w.client_id == ^client_id)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__), do: from(w in query, where: is_nil(w.archived_at))
  @spec include_content(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_content(query \\ __MODULE__, business_id) do
    exercises =
      from(e in Easy.Workouts.WorkoutExercise,
        where: e.business_id == ^business_id,
        order_by: [asc: e.position, asc: e.id]
      )

    groups =
      from(g in Easy.Workouts.ExerciseGroup,
        where: g.business_id == ^business_id,
        order_by: [asc: g.position, asc: g.id],
        preload: [exercises: ^exercises]
      )

    from(w in query, preload: [groups: ^groups])
  end
end
