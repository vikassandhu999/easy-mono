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
