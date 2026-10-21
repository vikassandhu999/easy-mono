defmodule Easy.Trackers.EntryAttachment do
  use Ecto.Schema
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "tracker_entry_attachments" do
    field :business_id, :binary_id
    field :client_id, :binary_id
    belongs_to :entry, Easy.Trackers.Entry
    belongs_to :attachment, Easy.Attachments.Attachment
    field :position, :integer
  end
end
