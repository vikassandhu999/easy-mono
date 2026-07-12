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

  @spec insert_changeset(String.t(), String.t(), String.t(), atom(), String.t(), map()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, id, uploaded_by_type, uploaded_by_id, attrs) do
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

  @spec with_ids(Ecto.Queryable.t(), [String.t()]) :: Ecto.Query.t()
  def with_ids(query \\ __MODULE__, ids), do: from(attachment in query, where: attachment.id in ^ids)

  @spec for_purpose(Ecto.Queryable.t(), :check_in_photo) :: Ecto.Query.t()
  def for_purpose(query \\ __MODULE__, :check_in_photo) do
    from(attachment in query, where: attachment.content_type in ^image_content_types())
  end

  @spec content_types() :: [String.t()]
  def content_types, do: @image_content_types ++ @video_content_types ++ @audio_content_types

  @spec image_content_types() :: [String.t()]
  def image_content_types, do: @image_content_types

  @spec max_byte_size(String.t()) :: pos_integer() | nil
  def max_byte_size(type) when type in @image_content_types, do: 15 * 1024 * 1024
  def max_byte_size(type) when type in @video_content_types, do: 50 * 1024 * 1024
  def max_byte_size(type) when type in @audio_content_types, do: 10 * 1024 * 1024
  def max_byte_size(_type), do: nil

  @spec max_byte_size() :: pos_integer()
  def max_byte_size, do: max_byte_size("image/jpeg")

  defp validate_byte_size(changeset) do
    max = max_byte_size(get_field(changeset, :content_type))

    validate_change(changeset, :byte_size, fn :byte_size, byte_size ->
      if is_integer(max) and byte_size > 0 and byte_size <= max,
        do: [],
        else: [byte_size: "is invalid"]
    end)
  end
end
