defmodule EasyWeb.Params.Signup do
  use Ecto.Schema

  import Ecto.Changeset

  embedded_schema do
    field :email, :string
    field :phone, :string
    field :full_name, :string
  end

  @type t() :: %__MODULE__{
          email: String.t() | nil,
          phone: String.t() | nil,
          full_name: String.t() | nil
        }

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(%EasyWeb.Params.Signup{} = signup, attrs) do
    signup
    |> cast(attrs, [
      :email,
      :phone,
      :full_name
    ])
    |> validate_email_or_phone()
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&'*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> validate_length(:full_name, max: 255)
  end

  defp validate_email_or_phone(changeset) do
    email = get_field(changeset, :email)
    phone = get_field(changeset, :phone)

    if is_nil(email) and is_nil(phone) do
      add_error(changeset, :base, "Either email or phone must be provided")
    else
      changeset
    end
  end
end
