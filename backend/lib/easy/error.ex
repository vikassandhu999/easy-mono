defmodule Easy.Error do
  @moduledoc "A factory for creating standardized application error structs."

  # 1. Define the error struct.
  #    We can add default values for safety.
  defstruct code: :internal_error,
            message: "An internal error occurred",
            detail: %{},
            status: :bad_request

  # 2. Alias the struct for convenience within this module
  # alias __MODULE__

  @doc "Builds the standardized error tuple with an %Error{} struct."
  def new(code, message, detail \\ %{}, status \\ :bad_request) do
    # 3. Return the error tuple with the struct
    %__MODULE__{
      code: code,
      message: message,
      detail: detail,
      status: status
    }
  end

  # --- Public-Facing Error Helpers ---

  @doc "404 Not Found"
  def not_found(detail_map \\ %{}) do
    new(
      :not_found,
      "The requested resource was not found.",
      detail_map,
      :not_found
    )
  end

  @doc "403 Forbidden"
  def unauthorized(detail_map \\ %{}) do
    new(
      :unauthorized,
      "You are not authorized to perform this action.",
      detail_map,
      :forbidden
    )
  end

  @doc "422 Unprocessable Entity"
  def unprocessable(changeset_or_detail) do
    data =
      case changeset_or_detail do
        %Ecto.Changeset{} = changeset ->
          %{fields: traverse_errors(changeset)}

        detail when is_map(detail) ->
          detail

        detail when is_binary(detail) ->
          nil
      end

    message =
      case changeset_or_detail do
        %Ecto.Changeset{} -> "The data provided was invalid."
        detail when is_map(detail) -> "The data provided was invalid."
        detail when is_binary(detail) -> detail
      end

    new(
      :invalid_input,
      message,
      data,
      :unprocessable_entity
    )
  end

  # --- Core Builder Function ---

  defp traverse_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  def to_map(%__MODULE__{} = error) do
    %{
      code: error.code,
      message: error.message,
      detail: error.detail,
      status: error.status
    }
  end
end
