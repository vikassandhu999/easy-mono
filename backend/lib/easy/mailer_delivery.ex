defmodule Easy.MailerDelivery do
  @moduledoc """
  Handles asynchronous email delivery with error handling and logging.

  This module provides functions to send emails asynchronously using Task.Supervisor,
  with proper error handling and logging for production environments.
  """

  require Logger
  alias Easy.Mailer

  @doc """
  Delivers an email asynchronously.

  This function sends the email in a background task and logs any errors that occur.
  It returns immediately without waiting for the email to be sent.

  ## Parameters

    - email: A Swoosh.Email struct to be delivered
    - opts: Optional keyword list of options
      - :on_error - Function to call if delivery fails (receives error as argument)
      - :metadata - Map of metadata to include in logs

  ## Examples

      iex> email = Easy.Emails.otp_verification_email("user@example.com", "123456")
      iex> Easy.MailerDelivery.deliver_async(email)
      :ok

      iex> email = Easy.Emails.login_otp_email("user@example.com", "123456")
      iex> Easy.MailerDelivery.deliver_async(email, metadata: %{user_id: 123})
      :ok
  """
  def deliver_async(email, opts \\ []) do
    metadata = Keyword.get(opts, :metadata, %{})
    on_error = Keyword.get(opts, :on_error)

    Task.Supervisor.start_child(Easy.TaskSupervisor, fn ->
      deliver_with_error_handling(email, metadata, on_error)
    end)

    :ok
  end

  @doc """
  Delivers an email synchronously with error handling.

  This function sends the email immediately and returns the result.
  Use this when you need to know if the email was sent successfully.

  ## Parameters

    - email: A Swoosh.Email struct to be delivered
    - opts: Optional keyword list of options
      - :metadata - Map of metadata to include in logs

  ## Returns

    - `{:ok, response}` if the email was sent successfully
    - `{:error, reason}` if the email failed to send

  ## Examples

      iex> email = Easy.Emails.otp_verification_email("user@example.com", "123456")
      iex> Easy.MailerDelivery.deliver_sync(email)
      {:ok, %{id: "..."}}
  """
  def deliver_sync(email, opts \\ []) do
    metadata = Keyword.get(opts, :metadata, %{})

    case Mailer.deliver(email) do
      {:ok, response} ->
        log_success(email, metadata)
        {:ok, response}

      {:error, reason} = error ->
        log_error(email, reason, metadata)
        error
    end
  end

  # Private functions

  defp deliver_with_error_handling(email, metadata, on_error) do
    case Mailer.deliver(email) do
      {:ok, _response} ->
        log_success(email, metadata)
        :ok

      {:error, reason} ->
        log_error(email, reason, metadata)

        if on_error do
          try do
            on_error.(reason)
          rescue
            error ->
              Logger.error("Error in on_error callback: #{inspect(error)}")
          end
        end

        {:error, reason}
    end
  rescue
    error ->
      log_exception(email, error, __STACKTRACE__, metadata)

      if on_error do
        try do
          on_error.(error)
        rescue
          callback_error ->
            Logger.error("Error in on_error callback: #{inspect(callback_error)}")
        end
      end

      {:error, error}
  end

  defp log_success(email, metadata) do
    recipient = extract_recipient(email)
    subject = email.subject

    Logger.info("Email sent successfully",
      recipient: recipient,
      subject: subject,
      metadata: metadata
    )
  end

  defp log_error(email, reason, metadata) do
    recipient = extract_recipient(email)
    subject = email.subject

    Logger.error("Failed to send email",
      recipient: recipient,
      subject: subject,
      reason: inspect(reason),
      metadata: metadata
    )
  end

  defp log_exception(email, error, stacktrace, metadata) do
    recipient = extract_recipient(email)
    subject = email.subject

    Logger.error("Exception while sending email",
      recipient: recipient,
      subject: subject,
      error: inspect(error),
      stacktrace: Exception.format_stacktrace(stacktrace),
      metadata: metadata
    )
  end

  defp extract_recipient(email) do
    case email.to do
      [{_name, address}] ->
        address

      [{address}] ->
        address

      [address] when is_binary(address) ->
        address

      addresses when is_list(addresses) ->
        Enum.map(addresses, fn
          {_name, addr} -> addr
          {addr} -> addr
          addr when is_binary(addr) -> addr
        end)
        |> Enum.join(", ")

      _ ->
        "unknown"
    end
  end
end
