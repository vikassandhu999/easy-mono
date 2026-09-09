defmodule Easy.MailerDeliveryTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog
  import Swoosh.Email

  alias Easy.MailerDelivery

  defmodule Adapter do
    use Swoosh.Adapter

    def deliver(email, _config) do
      send(email.private.test_pid, {:delivery, self(), email.subject})

      case email.subject do
        "reject" -> {:error, :provider_unavailable}
        "large error" -> {:error, %{body: String.duplicate("x", 100_000)}}
        "raise" -> raise "provider exception"
        _ -> {:ok, %{id: "delivered"}}
      end
    end
  end

  setup do
    config = Application.fetch_env!(:easy, Easy.Mailer)
    Application.put_env(:easy, Easy.Mailer, adapter: Adapter)
    on_exit(fn -> Application.put_env(:easy, Easy.Mailer, config) end)
    :ok
  end

  test "asynchronous delivery runs outside the caller and attempts delivery once" do
    assert :ok = MailerDelivery.deliver_async(email("success"))
    assert_receive {:delivery, worker, "success"}
    refute worker == self()
    refute_receive {:delivery, _, _}
  end

  test "a full email pool applies back-pressure by delivering in the caller" do
    assert is_pid(Process.whereis(Easy.MailerSupervisor))

    workers =
      for _ <- 1..20 do
        {:ok, pid} = Task.Supervisor.start_child(Easy.MailerSupervisor, fn -> receive do: (:stop -> :ok) end)
        pid
      end

    on_exit(fn ->
      Enum.each(workers, &Task.Supervisor.terminate_child(Easy.MailerSupervisor, &1))
    end)

    assert :ok = MailerDelivery.deliver_async(email("overflow"))
    caller = self()
    assert_receive {:delivery, ^caller, "overflow"}
    refute_receive {:delivery, _, _}
  end

  test "synchronous provider errors remain actionable" do
    capture_log(fn ->
      assert {:error, :provider_unavailable} = MailerDelivery.deliver_sync(email("reject"))
    end)
  end

  test "provider errors are bounded in logs without truncating the returned error" do
    log =
      capture_log(fn ->
        assert {:error, %{body: body}} = MailerDelivery.deliver_sync(email("large error"))
        assert byte_size(body) == 100_000
      end)

    assert log =~ "Failed to send email"
    assert log =~ "recipient@example.test"
    assert byte_size(log) < 5_000
  end

  test "delivery spans report duration and normalized outcomes without email metadata" do
    handler = {__MODULE__, make_ref()}
    prefix = [:easy, :mailer, :delivery]
    events = [prefix ++ [:start], prefix ++ [:stop]]
    :ok = :telemetry.attach_many(handler, events, &__MODULE__.capture_delivery_event/4, self())
    on_exit(fn -> :telemetry.detach(handler) end)

    for {subject, outcome} <- [{"success", :ok}, {"reject", :error}, {"raise", :error}] do
      capture_log(fn -> MailerDelivery.deliver_sync(email(subject), metadata: %{private_value: "secret"}) end)

      assert_receive {:telemetry_event, [:easy, :mailer, :delivery, :start], _, start_metadata}
      assert Map.keys(start_metadata) == [:telemetry_span_context]

      assert_receive {:telemetry_event, [:easy, :mailer, :delivery, :stop], %{duration: duration}, stop_metadata}
      assert is_integer(duration) and duration >= 0
      assert stop_metadata.outcome == outcome
      assert stop_metadata.telemetry_span_context == start_metadata.telemetry_span_context
      assert Enum.sort(Map.keys(stop_metadata)) == [:outcome, :telemetry_span_context]
    end
  end

  def capture_delivery_event(event, measurements, metadata, test_pid) do
    if self() == test_pid, do: send(test_pid, {:telemetry_event, event, measurements, metadata})
  end

  test "synchronous provider exceptions return an error rather than killing reminder work" do
    capture_log(fn ->
      assert {:error, %RuntimeError{message: "provider exception"}} = MailerDelivery.deliver_sync(email("raise"))
    end)
  end

  test "asynchronous failures notify the callback exactly once even when the callback raises" do
    parent = self()

    for subject <- ["reject", "raise"] do
      capture_log(fn ->
        assert :ok =
                 MailerDelivery.deliver_async(email(subject),
                   on_error: fn reason ->
                     send(parent, {:failed, subject, reason})
                     raise "callback exception"
                   end
                 )

        assert_receive {:failed, ^subject, _}
        refute_receive {:failed, ^subject, _}
      end)
    end
  end

  defp email(subject) do
    new()
    |> from("sender@example.test")
    |> to("recipient@example.test")
    |> subject(subject)
    |> put_private(:test_pid, self())
  end
end
