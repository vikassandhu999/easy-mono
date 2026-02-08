defmodule Easy.Error do
  defexception [:code, :message, :detail, :status]

  @type t :: %__MODULE__{}

  @impl true
  def exception(opts) do
    code = Keyword.get(opts, :code, :internal_error)
    message = Keyword.get(opts, :message, "An internal error occurred")
    detail = Keyword.get(opts, :detail, %{})
    status = Keyword.get(opts, :status, :bad_request)

    %__MODULE__{
      code: code,
      message: message,
      detail: detail,
      status: status
    }
  end

  def new(code, message, detail \\ %{}, status \\ :bad_request) do
    # 3. Return the error tuple with the struct
    %__MODULE__{
      code: code,
      message: message,
      detail: detail,
      status: status
    }
  end

  def not_found(message \\ "The requested resource was not found.", detail_map \\ %{}) do
    new(
      :not_found,
      message,
      detail_map,
      :not_found
    )
  end

  def unauthorized(message \\ "Insufficient permissions to perform this action.") do
    new(
      :unauthorized,
      message,
      %{},
      :forbidden
    )
  end

  def unauthenticated(message \\ "You must be authenticated to access this resource.") do
    new(
      :unauthenticated,
      message,
      %{},
      :unauthorized
    )
  end

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

  def to_map(%__MODULE__{} = error) do
    %{
      code: error.code,
      message: error.message,
      detail: error.detail,
      status: error.status
    }
  end
end
