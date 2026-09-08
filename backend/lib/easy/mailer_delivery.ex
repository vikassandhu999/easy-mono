defmodule Easy.MailerDelivery do
  require Logger
  alias Easy.Mailer

  @spec deliver_async(Swoosh.Email.t(), keyword()) :: :ok
  def deliver_async(email, opts \\ []) do
    metadata = Keyword.get(opts, :metadata, %{})
    on_error = Keyword.get(opts, :on_error)

    deliver = fn ->
      case deliver_sync(email, metadata: metadata) do
        {:ok, _response} -> :ok
        {:error, reason} -> notify_error(on_error, reason)
      end
    end

    case Task.Supervisor.start_child(Easy.MailerSupervisor, deliver) do
      {:ok, _pid} ->
        :ok

      # Slow the producer when the email pool is full instead of growing tasks
      # without bound or silently dropping an OTP or invitation.
      {:error, :max_children} ->
        :telemetry.execute([:easy, :mailer, :backpressure], %{count: 1}, %{})
        deliver.()
    end

    :ok
  end

  @spec deliver_sync(Swoosh.Email.t(), keyword()) :: {:ok, term()} | {:error, term()}
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
  rescue
    error ->
      log_exception(email, error, __STACKTRACE__, Keyword.get(opts, :metadata, %{}))
      {:error, error}
  end

  defp notify_error(nil, _reason), do: :ok

  defp notify_error(callback, reason) do
    callback.(reason)
    :ok
  rescue
    error -> Logger.error("Error in on_error callback: #{inspect(error)}")
  end

  defp log_success(email, metadata) do
    recipient = extract_recipient(email)
    subject = email.subject

    Logger.info("Email sent successfully recipient=#{recipient} subject=#{subject} metadata=#{inspect(metadata)}")
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
        Enum.map_join(addresses, ", ", fn
          {_name, addr} -> addr
          {addr} -> addr
          addr when is_binary(addr) -> addr
        end)

      _ ->
        "unknown"
    end
  end
end
