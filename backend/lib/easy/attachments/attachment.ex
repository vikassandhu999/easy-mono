defmodule Easy.Attachments.Attachment do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  @actors [:coach, :client, :system]
  @image_content_types ~w(image/jpeg image/png image/webp image/heic)
  @video_content_types ~w(video/mp4 video/webm video/quicktime)
  @audio_content_types ~w(audio/webm audio/mp4 audio/mpeg)

  @type t :: %__MODULE__{}

  schema "attachments" do
    field :uploaded_by_type, Ecto.Enum, values: @actors
    field :uploaded_by_id, :binary_id
    field :storage_key, :string
    field :content_type, :string
    field :byte_size, :integer
    field :duration_ms, :integer

    belongs_to :business, Business
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), atom(), String.t(), String.t(), String.t(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, uploaded_by_type, uploaded_by_id, client_id, id, attrs) do
    %__MODULE__{id: id}
    |> cast(attrs, [:storage_key, :content_type, :byte_size, :duration_ms])
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:uploaded_by_type, uploaded_by_type)
    |> put_change(:uploaded_by_id, uploaded_by_id)
    |> validate_required([
      :business_id,
      :client_id,
      :uploaded_by_type,
      :uploaded_by_id,
      :storage_key,
      :content_type,
      :byte_size
    ])
    |> validate_inclusion(:content_type, content_types())
    |> validate_byte_size()
    |> validate_number(:duration_ms, greater_than: 0, less_than_or_equal_to: 300_000)
    |> check_constraint(:uploaded_by_type, name: :attachments_uploaded_by_type_check)
    |> check_constraint(:duration_ms, name: :attachments_duration_ms_check)
    |> unique_constraint(:storage_key)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :attachments_client_business_id_fkey)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(attachment in query, where: attachment.business_id == ^business_id)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(attachment in query,
      where: attachment.business_id == ^business_id and attachment.client_id == ^client_id
    )
  end

  @spec for_ids(Ecto.Queryable.t(), [String.t()] | String.t() | nil) :: Ecto.Query.t()
  def for_ids(query \\ __MODULE__, ids)
  def for_ids(query, nil), do: query
  def for_ids(query, ""), do: query
  def for_ids(query, ids), do: from(attachment in query, where: attachment.id in ^ids)

  @spec content_types() :: [String.t()]
  def content_types, do: @image_content_types ++ @video_content_types ++ @audio_content_types

  @spec image_content_types() :: [String.t()]
  def image_content_types, do: @image_content_types

  defp max_byte_size(type) when type in @image_content_types, do: 15 * 1024 * 1024
  defp max_byte_size(type) when type in @video_content_types, do: 50 * 1024 * 1024
  defp max_byte_size(type) when type in @audio_content_types, do: 10 * 1024 * 1024
  defp max_byte_size(_type), do: nil

  defp validate_byte_size(changeset) do
    max = max_byte_size(get_field(changeset, :content_type))

    validate_change(changeset, :byte_size, fn :byte_size, byte_size ->
      if is_integer(max) and byte_size > 0 and byte_size <= max,
        do: [],
        else: [byte_size: "is invalid"]
    end)
  end
end
