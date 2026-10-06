defmodule Easy.Trackers.Request do
  use Ecto.Schema
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "tracker_requests" do
    field :business_id, :binary_id
    field :client_id, :binary_id
    belongs_to :tracker, Easy.Trackers.Tracker
    field :requested_by, :binary_id
    field :requested_at, :utc_datetime_usec
    field :cancelled_at, :utc_datetime_usec
  end
end
