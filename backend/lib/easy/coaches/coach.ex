defmodule Easy.Organizations.Coach do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Accounts.User
  alias Easy.Organizations.Business

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :name, :string
    field :title, :string
    field :about, :string
    field :profile_picture_url, :string

    field :contact_email, :string
    field :contact_phone, :string

    field :specializations, {:array, :string}

    field :is_active, :boolean, default: true

    field :website, :string
    field :instagram_handle, :string
    field :facebook_url, :string
    field :linkedin_url, :string
    field :twitter_handle, :string
    field :youtube_url, :string

    field :settings, :map, default: %{}

    # Relationships
    belongs_to :business, Business
    belongs_to :user, User

    timestamps(type: :utc_datetime)
  end

  @doc """
  Changeset for creating a new coach.
  """
  def create_changeset(coach, attrs) do
    coach
    |> cast(attrs, [
      :business_id,
      :user_id,
      :name,
      :title,
      :about,
      :profile_picture_url,
      :contact_email,
      :contact_phone,
      :specializations,
      :is_active,
      :website,
      :instagram_handle,
      :facebook_url,
      :linkedin_url,
      :twitter_handle,
      :youtube_url,
      :settings
    ])
    |> validate_required([:business_id, :user_id, :name])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_email(:contact_email)
    |> validate_urls()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:business_id, :user_id],
      message: "already exists as a coach for this business"
    )
  end

  @doc """
  Changeset for updating coach details.
  """
  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [
      :name,
      :title,
      :about,
      :profile_picture_url,
      :contact_email,
      :contact_phone,
      :specializations,
      :is_active,
      :website,
      :instagram_handle,
      :facebook_url,
      :linkedin_url,
      :twitter_handle,
      :youtube_url,
      :settings
    ])
    |> validate_length(:name, min: 2, max: 100)
    |> validate_email(:contact_email)
    |> validate_urls()
  end

  # Private validation helpers

  defp validate_email(changeset, field) do
    case get_field(changeset, field) do
      nil ->
        changeset

      _email ->
        validate_format(changeset, field, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    end
  end

  defp validate_urls(changeset) do
    changeset
    |> validate_url(:website)
    |> validate_url(:facebook_url)
    |> validate_url(:linkedin_url)
    |> validate_url(:youtube_url)
  end

  defp validate_url(changeset, field) do
    case get_field(changeset, field) do
      nil ->
        changeset

      url ->
        if String.starts_with?(url, ["http://", "https://"]) do
          changeset
        else
          add_error(changeset, field, "must start with http:// or https://")
        end
    end
  end

  @doc """
  Returns true if the coach is active.
  """
  def active?(%__MODULE__{is_active: true}), do: true
  def active?(%__MODULE__{}), do: false
end
