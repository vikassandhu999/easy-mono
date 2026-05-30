defmodule Easy.Identity.Users do
  alias Easy.Identity.User
  alias Easy.Repo

  @spec create(map()) :: {:ok, User.t()} | {:error, any()}
  def create(attrs) do
    User.insert_changeset(attrs)
    |> Repo.insert()
  end

  @spec touch_confirmation_sent_at(User.t()) :: {:ok, User.t()} | {:error, any()}
  def touch_confirmation_sent_at(%User{} = user) do
    user
    |> User.touch_confirmation_sent()
    |> Repo.update()
  end

  @spec get_by_email(String.t()) :: {:ok, User.t()} | {:error, any()}
  def get_by_email(email) do
    case Repo.get_by(User, email: email) do
      nil ->
        {:error, Easy.Error.not_found("user_not_found", "User with the provided email does not exist")}

      user ->
        {:ok, user}
    end
  end

  @spec get_by_id(String.t()) :: {:ok, User.t()} | {:error, any()}
  def get_by_id(id) do
    case Repo.get(User, id) do
      nil ->
        {:error, Easy.Error.not_found("user_not_found", "User with the provided ID does not exist")}

      user ->
        {:ok, user}
    end
  end

  @spec confirm_user_email(User.t()) :: {:ok, User.t()} | {:error, any()}
  def confirm_user_email(user) do
    user
    |> User.confirm_email()
    |> Repo.update()
  end
end
