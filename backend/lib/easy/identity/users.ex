defmodule Easy.Identity.Users do
  import Ecto.Query, only: [lock: 2]

  alias Easy.Identity.User
  alias Easy.Repo

  @spec create(DateTime.t() | nil, map()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def create(confirmation_sent_at \\ nil, attrs) do
    User.insert_changeset(confirmation_sent_at, attrs)
    |> Repo.insert()
  end

  @spec create_if_absent(DateTime.t() | nil, map()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def create_if_absent(confirmation_sent_at \\ nil, attrs) do
    confirmation_sent_at
    |> User.insert_changeset(attrs)
    |> Repo.insert(
      on_conflict: {:replace, [:email]},
      conflict_target: {:unsafe_fragment, "(email) WHERE email IS NOT NULL"},
      returning: true
    )
  end

  @spec touch_confirmation_sent_at(User.t()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def touch_confirmation_sent_at(%User{} = user) do
    user
    |> User.touch_confirmation_sent(DateTime.utc_now(:second))
    |> Repo.update()
  end

  @spec get_by_email(String.t()) :: {:ok, User.t()} | {:error, :user_not_found}
  def get_by_email(email) do
    case Repo.get_by(User, email: email) do
      nil ->
        {:error, :user_not_found}

      user ->
        {:ok, user}
    end
  end

  @spec get_by_id(String.t()) :: {:ok, User.t()} | {:error, :user_not_found}
  def get_by_id(id) do
    case Repo.get(User, id) do
      nil ->
        {:error, :user_not_found}

      user ->
        {:ok, user}
    end
  end

  @spec confirm_user_email(User.t()) :: {:ok, User.t()} | {:error, Ecto.Changeset.t()}
  def confirm_user_email(user) do
    user
    |> User.confirm_email(DateTime.utc_now(:second))
    |> Repo.update()
  end

  @spec lock_by_id(String.t()) :: {:ok, User.t()} | {:error, :user_not_found}
  def lock_by_id(id) do
    case User |> lock("FOR UPDATE") |> Repo.get(id) do
      nil -> {:error, :user_not_found}
      user -> {:ok, user}
    end
  end
end
