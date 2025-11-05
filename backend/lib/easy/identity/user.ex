defmodule Easy.Identity.User do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Repo

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :email_confirmed_at, :utc_datetime, default: nil
    field :phone, :string
    field :phone_confirmed_at, :utc_datetime, default: nil
    field :encrypted_password, :string, default: nil, redact: true
    field :settings, :map, default: %{}

    timestamps(type: :utc_datetime_usec)
  end

  @doc """
  Standard changeset for updating user attributes.
  """
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :phone,
      :email_confirmed_at,
      :phone_confirmed_at,
      :encrypted_password,
      :settings
    ])
    |> validate_required([:email])
    |> validate_email()
    |> validate_phone()
    |> unique_constraint(:email)
    |> unique_constraint(:phone)
  end

  @doc """
  Changeset for user registration (signup).
  Requires either email or phone.
  """
  def registration_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :phone, :settings])
    |> validate_email()
    |> validate_phone()
    |> validate_contact_present()
    |> unique_constraint(:email)
    |> unique_constraint(:phone)
  end

  @doc """
  Changeset for confirming email address.
  """
  def confirm_email_changeset(user) do
    change(user, %{email_confirmed_at: DateTime.utc_now() |> DateTime.truncate(:second)})
  end

  @doc """
  Changeset for confirming phone number.
  """
  def confirm_phone_changeset(user) do
    change(user, %{phone_confirmed_at: DateTime.utc_now() |> DateTime.truncate(:second)})
  end

  # Query Functions

  @doc """
  Finds a user by ID.
  """
  def get_user(id) do
    Repo.get(__MODULE__, id)
  end

  @doc """
  Finds a user by email address.
  """
  def get_by_email(email) when is_binary(email) do
    from(u in __MODULE__,
      where: u.email == ^email
    )
    |> Repo.one()
  end

  def get_by_email(_), do: nil

  @doc """
  Finds a user by phone number.
  """
  def get_by_phone(phone) when is_binary(phone) do
    from(u in __MODULE__,
      where: u.phone == ^phone
    )
    |> Repo.one()
  end

  def get_by_phone(_), do: nil

  @doc """
  Finds a user by email or phone.
  """
  def get_by_email_or_phone(email, phone) do
    from(u in __MODULE__,
      where: u.email == ^email or u.phone == ^phone
    )
    |> Repo.one()
  end

  # Helper Functions

  @doc """
  Checks if user's email is confirmed.
  """
  def email_confirmed?(%__MODULE__{email_confirmed_at: nil}), do: false
  def email_confirmed?(%__MODULE__{email_confirmed_at: _}), do: true

  @doc """
  Checks if user's phone is confirmed.
  """
  def phone_confirmed?(%__MODULE__{phone_confirmed_at: nil}), do: false
  def phone_confirmed?(%__MODULE__{phone_confirmed_at: _}), do: true

  @doc """
  Checks if user has any confirmed contact method.
  """
  def has_confirmed_contact?(%__MODULE__{} = user) do
    email_confirmed?(user) or phone_confirmed?(user)
  end

  @doc """
  Marks user's email as confirmed.
  Returns {:ok, user} or {:error, changeset}.
  """
  def confirm_email(%__MODULE__{} = user) do
    user
    |> confirm_email_changeset()
    |> Repo.update()
  end

  @doc """
  Marks user's phone as confirmed.
  Returns {:ok, user} or {:error, changeset}.
  """
  def confirm_phone(%__MODULE__{} = user) do
    user
    |> confirm_phone_changeset()
    |> Repo.update()
  end

  # Private Validation Functions

  defp validate_email(changeset) do
    changeset
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email address")
    |> validate_length(:email, max: 160)
    |> update_change(:email, &String.downcase/1)
  end

  defp validate_phone(changeset) do
    changeset
    |> validate_format(:phone, ~r/^\+?[1-9]\d{1,14}$/, message: "must be a valid phone number")
    |> validate_length(:phone, min: 10, max: 15)
  end

  defp validate_contact_present(changeset) do
    email = get_field(changeset, :email)
    phone = get_field(changeset, :phone)

    if is_nil(email) and is_nil(phone) do
      add_error(changeset, :email, "either email or phone must be provided")
    else
      changeset
    end
  end
end
