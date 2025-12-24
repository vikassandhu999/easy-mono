defmodule Easy.Organizations.Coach do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Clients.CoachClientAssignment

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "coaches" do
    field :bio, :string
    field :specialties, {:array, :string}
    field :credentials, :map
    field :status, :string, default: "active"

    # Social links
    field :instagram_url, :string
    field :facebook_url, :string
    field :youtube_url, :string
    field :x_url, :string

    # Additional profile fields
    field :years_of_experience, :integer
    field :certifications, {:array, :string}

    belongs_to :user, Easy.Accounts.User
    belongs_to :business, Easy.Organizations.Business

    many_to_many :clients, Easy.Clients.Client, join_through: CoachClientAssignment

    timestamps()
  end

  @valid_statuses ~w(active inactive suspended)
  @social_url_fields [:instagram_url, :facebook_url, :youtube_url, :x_url]
  @max_specialties 6
  @max_bio_words 200

  def changeset(coach, attrs) do
    coach
    |> cast(attrs, [
      :bio,
      :specialties,
      :credentials,
      :status,
      :instagram_url,
      :facebook_url,
      :youtube_url,
      :x_url,
      :years_of_experience,
      :certifications
    ])
    |> validate_status()
    |> validate_credentials()
    |> validate_bio_word_count()
    |> validate_specialties_count()
    |> validate_social_urls()
    |> validate_years_of_experience()
  end

  def create_changeset(coach, attrs) do
    coach
    |> cast(attrs, [
      :user_id,
      :business_id,
      :bio,
      :specialties,
      :credentials,
      :status,
      :instagram_url,
      :facebook_url,
      :youtube_url,
      :x_url,
      :years_of_experience,
      :certifications
    ])
    |> validate_required([:user_id, :business_id])
    |> validate_status()
    |> validate_credentials()
    |> validate_bio_word_count()
    |> validate_specialties_count()
    |> validate_social_urls()
    |> validate_years_of_experience()
    |> ensure_status()
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:user_id, :business_id],
      name: :coaches_user_id_business_id_index,
      message: "already has a coach profile for this business"
    )
  end

  defp ensure_status(changeset) do
    case get_field(changeset, :status) do
      nil -> put_change(changeset, :status, "active")
      _ -> changeset
    end
  end

  def update_changeset(coach, attrs) do
    coach
    |> cast(attrs, [
      :bio,
      :specialties,
      :credentials,
      :status,
      :instagram_url,
      :facebook_url,
      :youtube_url,
      :x_url,
      :years_of_experience,
      :certifications
    ])
    |> validate_status()
    |> validate_credentials()
    |> validate_bio_word_count()
    |> validate_specialties_count()
    |> validate_social_urls()
    |> validate_years_of_experience()
  end

  # Private validation helpers

  defp validate_status(changeset) do
    changeset
    |> validate_inclusion(:status, @valid_statuses,
      message: "must be one of: #{Enum.join(@valid_statuses, ", ")}"
    )
  end

  defp validate_credentials(changeset) do
    case get_change(changeset, :credentials) do
      nil ->
        changeset

      credentials when is_map(credentials) ->
        changeset

      _ ->
        add_error(changeset, :credentials, "must be a valid map")
    end
  end

  defp validate_bio_word_count(changeset) do
    case get_change(changeset, :bio) do
      nil ->
        changeset

      bio when is_binary(bio) ->
        word_count =
          bio
          |> String.split(~r/\s+/, trim: true)
          |> length()

        if word_count > @max_bio_words do
          add_error(
            changeset,
            :bio,
            "cannot exceed #{@max_bio_words} words (currently #{word_count} words)"
          )
        else
          changeset
        end

      _ ->
        changeset
    end
  end

  defp validate_specialties_count(changeset) do
    case get_change(changeset, :specialties) do
      nil ->
        changeset

      specialties when is_list(specialties) ->
        if length(specialties) > @max_specialties do
          add_error(changeset, :specialties, "cannot have more than #{@max_specialties} items")
        else
          changeset
        end

      _ ->
        changeset
    end
  end

  defp validate_social_urls(changeset) do
    Enum.reduce(@social_url_fields, changeset, fn field, acc ->
      validate_url_format(acc, field)
    end)
  end

  defp validate_url_format(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      "" ->
        changeset

      url when is_binary(url) ->
        case URI.parse(url) do
          %URI{scheme: scheme, host: host}
          when scheme in ["http", "https"] and is_binary(host) and host != "" ->
            changeset

          _ ->
            add_error(changeset, field, "must be a valid URL (e.g., https://example.com)")
        end

      _ ->
        changeset
    end
  end

  defp validate_years_of_experience(changeset) do
    changeset
    |> validate_number(:years_of_experience,
      greater_than_or_equal_to: 0,
      message: "must be 0 or greater"
    )
  end

  @doc """
  Returns true if the coach is active.
  """
  def active?(%__MODULE__{status: "active"}), do: true
  def active?(%__MODULE__{}), do: false
end
