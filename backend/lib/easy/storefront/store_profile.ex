defmodule Easy.Storefront.StoreProfile do
  use Ecto.Schema

  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @theme_colors ~w(orange blue green purple)

  schema "store_profiles" do
    field :slug, :string
    field :display_name, :string
    field :bio, :string
    field :photo_url, :string
    field :cover_image_url, :string
    field :social_links, :map, default: %{}
    field :theme_color, :string, default: "orange"
    field :is_published, :boolean, default: false
    field :intake_questions, {:array, :map}, default: []
    field :headline, :string
    field :trust_stats, {:array, :map}, default: []
    field :faq_items, {:array, :map}, default: []
    field :whatsapp_cta_enabled, :boolean, default: false
    field :whatsapp_cta_message, :string

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :slug,
    :display_name,
    :bio,
    :photo_url,
    :cover_image_url,
    :social_links,
    :theme_color,
    :is_published,
    :intake_questions,
    :headline,
    :trust_stats,
    :faq_items,
    :whatsapp_cta_enabled,
    :whatsapp_cta_message
  ]

  # Changesets

  @spec insert_changeset(map(), String.t()) :: Ecto.Changeset.t()
  def insert_changeset(attrs, business_id) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> validate_required([:slug, :display_name, :business_id])
    |> validate_slug()
    |> validate_inclusion(:theme_color, @theme_colors)
    |> unique_constraint(:slug)
    |> unique_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(profile, attrs) do
    profile
    |> cast(attrs, @cast_fields)
    |> validate_required([:slug, :display_name])
    |> validate_slug()
    |> validate_inclusion(:theme_color, @theme_colors)
    |> unique_constraint(:slug)
  end

  defp validate_slug(changeset) do
    changeset
    |> validate_format(:slug, ~r/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      message: "must contain only lowercase letters, numbers, and hyphens"
    )
    |> validate_length(:slug, min: 3, max: 60)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(sp in query, where: sp.business_id == ^business_id)
  end

  @spec by_slug(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def by_slug(query \\ __MODULE__, slug) do
    from(sp in query, where: sp.slug == ^slug)
  end

  @spec published(Ecto.Queryable.t()) :: Ecto.Query.t()
  def published(query \\ __MODULE__) do
    from(sp in query, where: sp.is_published == true)
  end

  # Actions

  @spec create(map(), String.t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs, business_id) do
    attrs
    |> insert_changeset(business_id)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(profile, attrs) do
    profile
    |> update_changeset(attrs)
    |> Repo.update()
  end

  @spec slug_available?(String.t(), String.t() | nil) :: boolean()
  def slug_available?(slug, exclude_business_id \\ nil) do
    query = by_slug(slug)

    query =
      case exclude_business_id do
        nil -> query
        id -> from(sp in query, where: sp.business_id != ^id)
      end

    not Repo.exists?(query)
  end

  @spec get_for_business(String.t()) :: t() | nil
  def get_for_business(business_id) do
    __MODULE__
    |> for_business(business_id)
    |> Repo.one()
  end
end
