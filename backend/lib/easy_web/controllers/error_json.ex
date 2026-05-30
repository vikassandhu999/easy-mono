defmodule EasyWeb.ErrorJSON do
  require Logger

  # Handles all app errors.
  def render(_template, %{app_error: error}) do
    Logger.error("Error: #{inspect(error)}")

    %{
      error_code: to_string(error.code),
      error_message: error.message,
      error_detail: error.detail
    }
  end

  # This function is called when a 404 error (like a
  # Phoenix.Router.NoRouteError) is raised.
  def render("404.json", _assigns) do
    %{
      error_code: "not_found",
      error_message: "The requested resource or route was not found."
    }
  end

  # This function is called for any unhandled exception
  # or crash in your application (a 500 error).
  def render("500.json", _assigns) do
    %{
      error_code: "internal_server_error",
      error_message: "An internal server error occurred."
    }
  end

  # This is a "catch-all" function. It's not strictly
  # necessary but is good practice. It handles any other
  # error status (like 401, 403, 503) that Phoenix
  # might raise as an exception.
  def render(template, assigns) do
    require Logger

    Logger.error("Rendering error for unexpected template: #{inspect(template)} \n#{inspect(assigns)}")

    %{
      error_code: "unknown_error",
      error_message: Phoenix.Controller.status_message_from_template(template)
    }
  rescue
    _ ->
      # Failsafe, just in case the template name was unexpected
      render("500.json", %{})
  end
end
