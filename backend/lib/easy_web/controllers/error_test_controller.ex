defmodule EasyWeb.ErrorTestController do
  use EasyWeb, :controller

  def trigger_error(conn, %{"type" => error_type} = params) do
    case error_type do
      "changeset" ->
        changeset = Ecto.Changeset.add_error(%Ecto.Changeset{data: %{}}, :email, "is invalid")
        {:error, changeset}

      "api_error" ->
        {:error, Easy.ApiError.not_found("User")}

      "unauthorized" ->
        {:error, :unauthorized}

      "forbidden" ->
        {:error, :forbidden}

      "not_found" ->
        {:error, :not_found}

      "bad_request" ->
        {:error, :bad_request}

      "unprocessable_entity" ->
        {:error, :unprocessable_entity}

      "atom_error" ->
        {:error, :some_custom_error}

      "string_error" ->
        {:error, "Custom error message"}

      "rate_limited" ->
        retry_after = Map.get(params, "retry_after", "60") |> String.to_integer()
        {:error, Easy.ApiError.rate_limited(retry_after)}

      "conflict" ->
        {:error, Easy.ApiError.conflict("Email already exists")}

      "validation_with_details" ->
        changeset =
          %Ecto.Changeset{data: %{}}
          |> Ecto.Changeset.add_error(:email, "can't be blank")
          |> Ecto.Changeset.add_error(:password, "is too short")

        {:error, changeset}

      "success" ->
        json(conn, %{message: "Success"})

      _ ->
        {:error, :bad_request}
    end
  end
end
