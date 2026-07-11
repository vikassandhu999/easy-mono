defmodule Easy.Error do
  defexception [:code, :message, :detail, :status]

  @type t :: %__MODULE__{}

  @spec new(atom() | String.t(), String.t(), map() | nil, atom()) :: t()
  def new(code, message, detail \\ %{}, status \\ :bad_request) do
    %__MODULE__{
      code: code,
      message: message,
      detail: detail,
      status: status
    }
  end

  @spec not_found(String.t(), map()) :: t()
  def not_found(message \\ "The requested resource was not found.", detail_map \\ %{}) do
    new(
      :not_found,
      message,
      detail_map,
      :not_found
    )
  end

  @spec unauthorized(String.t()) :: t()
  def unauthorized(message \\ "Insufficient permissions to perform this action.") do
    new(
      :unauthorized,
      message,
      %{},
      :forbidden
    )
  end

  @spec unprocessable(Ecto.Changeset.t() | map() | String.t()) :: t()
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

  defp traverse_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end

  @spec to_map(t()) :: map()
  def to_map(%__MODULE__{} = error) do
    %{
      code: error.code,
      message: error.message,
      detail: error.detail,
      status: error.status
    }
  end
end
