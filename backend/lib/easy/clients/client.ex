defmodule Easy.Clients.Client do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @client_statuses [:active, :inactive, :invited]

  schema "clients" do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :phone, :string
    field :notes, :string

    field :status, Ecto.Enum, values: @client_statuses

    field :invitation_token, :string
    field :invitation_sent_at, :utc_datetime

    belongs_to :user, Easy.Identity.User
    belongs_to :business, Easy.Orgs.Business
    belongs_to :creator, Easy.Orgs.Coach, foreign_key: :creator_id

    timestamps()
  end

  @spec invite_changeset(Easy.Orgs.Coach.t(), map()) :: Ecto.Changeset.t()
  def invite_changeset(coach, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:email, :first_name, :last_name, :phone, :notes])
    |> put_change(:business_id, coach.business_id)
    |> validate_required([:email, :business_id])
    |> put_change(:status, :invited)
    |> put_change(:invitation_token, generate_token())
    |> put_change(:invitation_sent_at, DateTime.utc_now(:second))
    |> unique_constraint(:email, name: :clients_business_id_email_index)
    |> put_assoc(:creator, coach)
  end

  defp generate_token do
    :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
  end

  def to_status_atom(status) when is_binary(status) do
    case String.downcase(status) do
      "active" -> :active
      "inactive" -> :inactive
      "invited" -> :invited
      _ -> nil
    end
  end

  def to_status_atom(_), do: nil
end
