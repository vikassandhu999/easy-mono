defmodule Easy.LibraryMedia.Media do
  use Ecto.Schema

  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  @actors [:coach, :client, :system]
  @image_content_types ~w(image/jpeg image/png image/webp)
  @video_content_types ~w(video/mp4 video/webm)

  @type t :: %__MODULE__{}

  schema "library_media" do
    field :uploaded_by_type, Ecto.Enum, values: @actors
    field :uploaded_by_id, :binary_id
    field :storage_key, :string
    field :content_type, :string
    field :byte_size, :integer

    belongs_to :business, Business

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), atom(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, uploaded_by_type, uploaded_by_id, id, attrs) do
    %__MODULE__{id: id}
    |> cast(attrs, [:storage_key, :content_type, :byte_size])
    |> put_change(:business_id, business_id)
    |> put_change(:uploaded_by_type, uploaded_by_type)
    |> put_change(:uploaded_by_id, uploaded_by_id)
    |> validate_required([:business_id, :storage_key, :content_type, :byte_size])
    |> validate_inclusion(:content_type, content_types())
    |> validate_byte_size()
    |> unique_constraint(:storage_key)
    |> foreign_key_constraint(:business_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(m in query, where: m.business_id == ^business_id)
  end

  @spec content_types() :: [String.t()]
  def content_types, do: @image_content_types ++ @video_content_types

  @spec kind(String.t()) :: :image | :video | nil
  def kind(type) when type in @image_content_types, do: :image
  def kind(type) when type in @video_content_types, do: :video
  def kind(_type), do: nil

  defp max_byte_size(type) when type in @image_content_types, do: 15 * 1024 * 1024
  defp max_byte_size(type) when type in @video_content_types, do: 50 * 1024 * 1024
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
