defmodule Easy.Chat.MessageAttachment do
  use Ecto.Schema

  alias Easy.Attachments.Attachment
  alias Easy.Chat.Message
  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  schema "chat_message_attachments" do
    field :position, :integer

    belongs_to :business, Business
    belongs_to :message, Message, foreign_key: :chat_message_id
    belongs_to :attachment, Attachment

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, message_id, attachment_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:position])
    |> put_change(:business_id, business_id)
    |> put_change(:chat_message_id, message_id)
    |> put_change(:attachment_id, attachment_id)
    |> validate_required([:business_id, :chat_message_id, :attachment_id, :position])
    |> unique_constraint([:chat_message_id, :attachment_id])
    |> unique_constraint([:chat_message_id, :position])
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:chat_message_id,
      name: :chat_message_attachments_message_business_id_fkey
    )
    |> foreign_key_constraint(:attachment_id,
      name: :chat_message_attachments_attachment_business_id_fkey
    )
  end

  @spec for_messages(Ecto.Queryable.t(), String.t(), [String.t()]) :: Ecto.Query.t()
  def for_messages(query \\ __MODULE__, business_id, message_ids) do
    from(link in query,
      where: link.business_id == ^business_id and link.chat_message_id in ^message_ids
    )
  end
end
