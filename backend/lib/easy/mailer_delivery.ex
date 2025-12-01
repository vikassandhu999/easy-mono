defmodule Easy.MailerDelivery do
  require Logger
  alias Easy.Mailer

  def deliver_async(email, opts \\ []) do
    metadata = Keyword.get(opts, :metadata, %{})
    on_error = Keyword.get(opts, :on_error)

    Task.Supervisor.start_child(Easy.TaskSupervisor, fn ->
      deliver_with_error_handling(email, metadata, on_error)
    end)

    :ok
  end

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

    Logger.error("""
    Failed to send email
    Recipient: #{recipient}
    Subject: #{subject}
    Reason: #{inspect(reason, pretty: true, limit: :infinity)}
    Metadata: #{inspect(metadata)}
    """)
  end

  defp log_exception(email, error, stacktrace, metadata) do
    recipient = extract_recipient(email)
    subject = email.subject

    Logger.error("""
    Exception while sending email
    Recipient: #{recipient}
    Subject: #{subject}
    Error: #{inspect(error, pretty: true, limit: :infinity)}
    Stacktrace:
    #{Exception.format_stacktrace(stacktrace)}
    Metadata: #{inspect(metadata)}
    """)
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
