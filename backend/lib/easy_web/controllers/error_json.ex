defmodule EasyWeb.ErrorJSON do
  @moduledoc """
  This module is invoked by your endpoint in case of errors on JSON requests.
  """

  # Renders changeset errors as JSON
  def render("changeset_error.json", %{changeset: changeset}) do
    %{
      code: "validation_error",
      error: "Validation failed",
      details: traverse_errors(changeset)
    }
  end

  # Renders a generic error as JSON
  def render("error.json", %{code: code, message: message, details: details}) do
    %{
      code: code,
      error: message,
      details: details
    }
  end

  def render("error.json", %{code: code, message: message}) do
    %{
      code: code,
      error: message,
      details: nil
    }
  end

  def render("error.json", %{message: message}) do
    %{
      code: "error",
      error: message,
      details: nil
    }
  end

  # Fallback for standard Phoenix error templates (404.json, 500.json, etc.)
  def render(template, _assigns) do
    %{
      code: extract_code_from_template(template),
      error: Phoenix.Controller.status_message_from_template(template),
      details: nil
    }
  end

  defp extract_code_from_template(template) do
    case template do
      "404.json" -> "not_found"
      "500.json" -> "internal_server_error"
      "422.json" -> "unprocessable_entity"
      "401.json" -> "unauthorized"
      "403.json" -> "forbidden"
      _ -> "error"
    end
  end

  defp traverse_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
