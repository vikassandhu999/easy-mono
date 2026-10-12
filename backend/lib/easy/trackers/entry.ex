defmodule Easy.Trackers.Entry do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "tracker_entries" do
    field :business_id, :binary_id
    field :client_id, :binary_id
    belongs_to :tracker, Easy.Trackers.Tracker
    field :local_date, :date
    field :timezone, :string
    field :recorded_by_type, Ecto.Enum, values: [:client, :coach]
    field :recorded_by_id, :binary_id
    field :request_id, :binary_id
    field :revision, :integer, default: 1
    field :number_value, :decimal
    field :entered_unit, :string
    field :rating_value, :integer
    field :yes_no_value, :boolean
    field :text_value, :string
    field :about_session_id, :binary_id
    field :deleted_at, :utc_datetime
    has_many :attachments, Easy.Trackers.EntryAttachment
    timestamps(type: :utc_datetime_usec)
  end

  @spec insert_changeset(String.t(), String.t(), tuple(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, {actor_type, actor_id}, tracker_id, timezone, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id, client_id: client_id, tracker_id: tracker_id, timezone: timezone)
    |> change(recorded_by_type: actor_type, recorded_by_id: actor_id)
    |> update_changeset(attrs)
    |> put_change(:revision, 1)
  end

  @editable [:local_date, :request_id, :number_value, :entered_unit, :rating_value, :yes_no_value, :text_value]
  @links [:about_session_id]
  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, @editable ++ @links)
    |> validate_required([:local_date, :request_id])
    |> validate_length(:text_value, max: 10_000)
    |> unique_constraint(:request_id, name: :tracker_entries_client_id_request_id_key)
    |> check_constraint(:number_value, name: :tracker_entries_value)
    |> foreign_key_constraint(:about_session_id, name: :tracker_entries_about_session_id_client_id_business_id_fkey)
    |> foreign_key_constraint(:tracker_id, name: :tracker_tenant_reference)
  end
end
