defmodule EasyWeb.Registration do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  embedded_schema do
    field :email, :string
    field :first_name, :string
    field :last_name, :string
    field :business_name, :string
    field :business_handle, :string
  end

  def to_user_attrs(%EasyWeb.Registration{} = reg) do
    %{
      email: reg.email,
      first_name: reg.first_name,
      last_name: reg.last_name
    }
  end

  def to_business_attrs(%EasyWeb.Registration{} = reg) do
    %{
      name: reg.business_name,
      handle: reg.business_handle
    }
  end

  def changeset(%EasyWeb.Registration{} = reg, attrs) do
    reserved_words =
      ~w(personal org admin support help security team staff official auth tip home dashboard bounties community user payment claims orgs projects jobs leaderboard onboarding pricing developers companies contracts blog docs open hiring sdk api repo go preview tv podcast)

    reg
    |> cast(attrs, [
      :email,
      :first_name,
      :last_name,
      :business_name,
      :business_handle
    ])
    |> validate_required([
      :email,
      :first_name,
      :last_name,
      :business_name,
      :business_handle
    ])
    |> validate_format(
      :email,
      ~r/^[\w.!#$%&’*+=?^`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    )
    |> validate_format(:business_handle, ~r/^[a-zA-Z0-9_-]{2,32}$/)
    |> validate_exclusion(:business_handle, reserved_words, message: "is reserved")
  end
end
