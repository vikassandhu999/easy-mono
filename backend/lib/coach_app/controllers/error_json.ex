defmodule CoachApp.ErrorJSON do
  @moduledoc """
  This module is invoked by the FallbackController to translate
  errors into a JSON response.
  """

  alias Easy.ApiError

  # Handle ApiError structs
  def error(%{error: %ApiError{} = error}) do
    %{
      error: %{
        code: error.code,
        message: error.message,
        details: error.details
      }
    }
  end

  # Handle standard Phoenix error templates
  def render(template, _assigns) do
    status = template |> to_string() |> String.split(".") |> List.first() |> String.to_integer()
    message = Phoenix.Controller.status_message_from_template(template)

    %{
      error: %{
        code: status_to_code(status),
        message: message
      }
    }
  end

  defp status_to_code(400), do: "BAD_REQUEST"
  defp status_to_code(401), do: "UNAUTHORIZED"
  defp status_to_code(403), do: "FORBIDDEN"
  defp status_to_code(404), do: "NOT_FOUND"
  defp status_to_code(422), do: "UNPROCESSABLE_ENTITY"
  defp status_to_code(500), do: "INTERNAL_SERVER_ERROR"
  defp status_to_code(_), do: "ERROR"
end
