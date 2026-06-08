defmodule Easy.Storefront.Testimonial do
  use Ecto.Schema

  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @testimonial_statuses [:active, :archived]

  schema "testimonials" do
    field :client_name, :string
    field :client_handle, :string
    field :quote, :string
    field :rating, :integer
    field :result_tag, :string
    field :program_name, :string
    field :duration_text, :string
    field :before_image_url, :string
    field :after_image_url, :string
    field :before_weight, :decimal
    field :after_weight, :decimal
    field :is_featured, :boolean, default: false
    field :status, Ecto.Enum, values: @testimonial_statuses, default: :active
    field :position, :integer, default: 0

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :client_name,
    :client_handle,
    :quote,
    :rating,
    :result_tag,
    :program_name,
    :duration_text,
    :before_image_url,
    :after_image_url,
    :before_weight,
    :after_weight,
    :is_featured,
    :status,
    :position
  ]

  # Changesets

  @spec insert_changeset(map(), String.t()) :: Ecto.Changeset.t()
  def insert_changeset(attrs, business_id) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> validate_required([:client_name, :business_id])
    |> validate_content_present()
    |> validate_paired_images()
    |> validate_paired_weights()
    |> validate_inclusion(:rating, 1..5)
    |> auto_suggest_result_tag()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(testimonial, attrs) do
    testimonial
    |> cast(attrs, @cast_fields)
    |> validate_required([:client_name])
    |> validate_content_present()
    |> validate_paired_images()
    |> validate_paired_weights()
    |> validate_inclusion(:rating, 1..5)
    |> auto_suggest_result_tag()
  end

  # At least one of quote or before_image_url must be present
  defp validate_content_present(changeset) do
    quote_val = get_field(changeset, :quote)
    before_image = get_field(changeset, :before_image_url)

    if blank?(quote_val) and blank?(before_image) do
      add_error(changeset, :quote, "either a quote or a before image is required")
    else
      changeset
    end
  end

  # If before_image_url is set, after_image_url should also be set
  defp validate_paired_images(changeset) do
    before_image = get_field(changeset, :before_image_url)
    after_image = get_field(changeset, :after_image_url)

    if not blank?(before_image) and blank?(after_image) do
      add_error(changeset, :after_image_url, "after image is required when before image is set")
    else
      changeset
    end
  end

  # before_weight and after_weight are only meaningful together
  defp validate_paired_weights(changeset) do
    before_weight = get_field(changeset, :before_weight)
    after_weight = get_field(changeset, :after_weight)

    cond do
      not is_nil(before_weight) and is_nil(after_weight) ->
        add_error(changeset, :after_weight, "after weight is required when before weight is set")

      is_nil(before_weight) and not is_nil(after_weight) ->
        add_error(changeset, :before_weight, "before weight is required when after weight is set")

      true ->
        changeset
    end
  end

  # Auto-suggest result_tag from weights if not already set
  defp auto_suggest_result_tag(changeset) do
    result_tag = get_field(changeset, :result_tag)
    before_weight = get_field(changeset, :before_weight)
    after_weight = get_field(changeset, :after_weight)

    if blank?(result_tag) and not is_nil(before_weight) and not is_nil(after_weight) do
      diff = Decimal.sub(before_weight, after_weight) |> Decimal.round(1)

      tag =
        case Decimal.compare(diff, Decimal.new(0)) do
          :gt -> "Lost #{Decimal.abs(diff)}kg"
          :lt -> "Gained #{Decimal.abs(diff)}kg"
          :eq -> nil
        end

      if tag, do: put_change(changeset, :result_tag, tag), else: changeset
    else
      changeset
    end
  end

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(t in query, where: t.business_id == ^business_id)
  end

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__) do
    from(t in query, where: t.status == ^:active)
  end

  @spec featured(Ecto.Queryable.t()) :: Ecto.Query.t()
  def featured(query \\ __MODULE__) do
    from(t in query, where: t.is_featured == true)
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(t in query, order_by: [asc: t.position, asc: t.inserted_at])
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(t in query, order_by: [desc: t.inserted_at])
  end

  # Actions

  @spec create(map(), String.t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(attrs, business_id) do
    attrs
    |> insert_changeset(business_id)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(testimonial, attrs) do
    testimonial
    |> update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(testimonial), do: Repo.delete(testimonial)
end
