defmodule Easy.ApiError do
  @moduledoc """
  Standardized API error structure and helpers.
  """

  defstruct [:status, :code, :message, :details]

  @type t :: %__MODULE__{
          status: integer(),
          code: String.t(),
          message: String.t(),
          details: map() | nil
        }

  # Common error constructors
  def bad_request(message, details \\ nil) do
    %__MODULE__{
      status: 400,
      code: "BAD_REQUEST",
      message: message,
      details: details
    }
  end

  def unauthorized(message \\ "Authentication required") do
    %__MODULE__{
      status: 401,
      code: "UNAUTHORIZED",
      message: message,
      details: nil
    }
  end

  def forbidden(message \\ "Access denied") do
    %__MODULE__{
      status: 403,
      code: "FORBIDDEN",
      message: message,
      details: nil
    }
  end

  def not_found(resource \\ "Resource") do
    %__MODULE__{
      status: 404,
      code: "NOT_FOUND",
      message: "#{resource} not found",
      details: nil
    }
  end

  def conflict(message, details \\ nil) do
    %__MODULE__{
      status: 409,
      code: "CONFLICT",
      message: message,
      details: details
    }
  end

  def unprocessable_entity(message, details \\ nil) do
    %__MODULE__{
      status: 422,
      code: "UNPROCESSABLE_ENTITY",
      message: message,
      details: details
    }
  end

  def internal_server_error(message \\ "Internal server error") do
    %__MODULE__{
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: message,
      details: nil
    }
  end

  def from_changeset(%Ecto.Changeset{} = changeset) do
    details = changeset_errors_to_map(changeset)

    %__MODULE__{
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: details
    }
  end

  defp changeset_errors_to_map(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
