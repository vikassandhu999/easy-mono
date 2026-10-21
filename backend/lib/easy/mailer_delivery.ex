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

    :telemetry.span([:easy, :mailer, :delivery], %{}, fn ->
      result = deliver_and_log(email, metadata)
      {result, %{outcome: elem(result, 0)}}
    end)
  end

  defp deliver_and_log(email, metadata) do
    case Mailer.deliver(email) do
      {:ok, response} ->
        log_delivery(:info, email, "Email sent successfully", metadata)
        {:ok, response}

      {:error, reason} = error ->
        log_delivery(:error, email, "Failed to send email: #{inspect_reason(reason)}", metadata)
        error
    end
  rescue
    error ->
      log_delivery(
        :error,
        email,
        "Exception while sending email: #{inspect_reason(error)}\n#{Exception.format_stacktrace(__STACKTRACE__)}",
        metadata
      )

      {:error, error}
  end

  defp notify_error(nil, _reason), do: :ok

  defp notify_error(callback, reason) do
    callback.(reason)
    :ok
  rescue
    error -> Logger.error("Error in on_error callback: #{inspect(error)}")
  end

  defp log_delivery(level, email, message, metadata) do
    recipients = Enum.map_join(email.to, ", ", fn {_name, address} -> address end)

    Logger.log(level, fn ->
      "#{message} recipient=#{recipients} subject=#{email.subject} metadata=#{inspect(metadata)}"
    end)
  end

  defp inspect_reason(reason), do: inspect(reason, pretty: true, limit: 20, printable_limit: 1024)
end
