defmodule Easy.Organizations.BusinessSettings do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "business_settings" do
    field :public_join_enabled, :boolean, default: false
    field :public_join_approval_required, :boolean, default: true
    field :public_join_code, :string
    field :public_join_client_limit, :integer

    field :tagline, :string
    field :cover_image_url, :string
    field :accent_color, :string

    belongs_to :business, Easy.Organizations.Business

    timestamps()
  end

  def create_changeset(settings, attrs) do
    settings
    |> cast(attrs, [:business_id])
    |> validate_required([:business_id])
    |> put_change(:public_join_code, generate_join_code())
    |> unique_constraint(:business_id)
    |> unique_constraint(:public_join_code)
    |> foreign_key_constraint(:business_id)
  end

  def public_join_changeset(settings, attrs) do
    settings
    |> cast(attrs, [
      :public_join_enabled,
      :public_join_approval_required,
      :public_join_code,
      :public_join_client_limit
    ])
    |> validate_number(:public_join_client_limit,
      greater_than: 0,
      message: "must be greater than 0"
    )
    |> validate_format(:public_join_code, ~r/^[a-zA-Z0-9_-]{4,32}$/,
      message: "must be 4-32 characters, alphanumeric with dashes and underscores only"
    )
    |> unique_constraint(:public_join_code)
    |> maybe_generate_join_code()
  end

  def branding_changeset(settings, attrs) do
    settings
    |> cast(attrs, [:tagline, :cover_image_url, :accent_color])
    |> validate_length(:tagline, max: 255)
    |> validate_format(:accent_color, ~r/^#[0-9A-Fa-f]{6}$/,
      message: "must be a valid hex color (e.g., #FF5722)"
    )
    |> validate_url(:cover_image_url)
  end

  def changeset(settings, attrs) do
    settings
    |> cast(attrs, [
      :public_join_enabled,
      :public_join_approval_required,
      :public_join_code,
      :public_join_client_limit,
      :tagline,
      :cover_image_url,
      :accent_color
    ])
    |> validate_number(:public_join_client_limit,
      greater_than: 0,
      message: "must be greater than 0"
    )
    |> validate_format(:public_join_code, ~r/^[a-zA-Z0-9_-]{4,32}$/,
      message: "must be 4-32 characters, alphanumeric with dashes and underscores only"
    )
    |> validate_length(:tagline, max: 255)
    |> validate_format(:accent_color, ~r/^#[0-9A-Fa-f]{6}$/,
      message: "must be a valid hex color (e.g., #FF5722)"
    )
    |> validate_url(:cover_image_url)
    |> unique_constraint(:public_join_code)
  end

  def regenerate_code_changeset(settings) do
    settings
    |> change()
    |> put_change(:public_join_code, generate_join_code())
    |> unique_constraint(:public_join_code)
  end

  def clear_code_changeset(settings) do
    settings
    |> change()
    |> put_change(:public_join_code, nil)
  end

  defp maybe_generate_join_code(changeset) do
    case get_field(changeset, :public_join_enabled) do
      true ->
        if is_nil(get_field(changeset, :public_join_code)) do
          put_change(changeset, :public_join_code, generate_join_code())
        else
          changeset
        end

      _ ->
        changeset
    end
  end

  defp generate_join_code do
    :crypto.strong_rand_bytes(6) |> Base.url_encode64(padding: false)
  end

  defp validate_url(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      url ->
        if String.match?(url, ~r/^https?:\/\/.+/) do
          changeset
        else
          add_error(changeset, field, "must be a valid URL starting with http:// or https://")
        end
    end
  end
end
