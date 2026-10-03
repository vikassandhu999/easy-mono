defmodule Easy.Billing.CheckoutIntentTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.{Billing, Ctx, Repo}
  alias Easy.Billing.{BusinessBilling, CheckoutIntent, Event}
  alias Easy.Clients.Client
  alias Easy.Identity.User
  alias Easy.Orgs.{Business, Coach}
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    unique_id = Ecto.UUID.generate()
    owner = insert(:user, email: "checkout-intent-#{unique_id}@example.test")
    business = insert(:business, owner: owner, handle: "ci-#{unique_id}")

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business.id, business.owner_user_id)
    end)

    %{business: business, ctx: Ctx.new(business.id, business.owner_user_id)}
  end

  test "two confirmed requests retain independent replay records", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_intent") |> Easy.Repo.update!()
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      quantity = conn.body_params["quantity"]
      send(parent, {:patch, quantity})
      Req.Test.json(conn, %{"id" => "sub_intent", "quantity" => quantity, "status" => "active"})
    end)

    first = Ecto.UUID.generate()
    second = Ecto.UUID.generate()

    assert {:ok, %{action: :updated, billing: %{paid_seats: 4}}} = Billing.checkout(ctx, 1, first)
    assert {:ok, %{action: :updated, billing: %{paid_seats: 5}}} = Billing.checkout(ctx, 1, second)
    assert {:ok, %{action: :updated, billing: %{paid_seats: 5}}} = Billing.checkout(ctx, 1, first)

    assert_received {:patch, 4}
    assert_received {:patch, 5}
    refute_received {:patch, _}
  end

  test "a held fresh request blocks same and competing requests without a second provider create", %{ctx: ctx} do
    parent = self()
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      send(parent, {:create_started, self()})

      receive do
        :release_create -> Req.Test.json(conn, %{"id" => "sub_pending", "plan_id" => "plan_test", "quantity" => 2, "status" => "created"})
      end
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.checkout(ctx, 2, request_id)
      end)

    assert_receive {:create_started, provider}, 1_000

    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 2, request_id)
    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 1, Ecto.UUID.generate())
    refute_receive {:create_started, _}, 100

    send(provider, :release_create)
    assert {:ok, %{action: :checkout}} = Task.await(task, 5_000)
  end

  test "syncing an active fresh subscription confirms the intent and clears pending checkout", %{business: business, ctx: ctx} do
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      case {conn.method, conn.request_path} do
        {"POST", "/v1/subscriptions"} ->
          Req.Test.json(conn, %{"id" => "sub_fresh", "plan_id" => "plan_test", "quantity" => 2, "status" => "created"})

        {"GET", "/v1/subscriptions/sub_fresh"} ->
          Req.Test.json(conn, %{"id" => "sub_fresh", "quantity" => 2, "status" => "active"})
      end
    end)

    assert {:ok, %{action: :checkout}} = Billing.checkout(ctx, 2, request_id)
    assert %{kind: :create, subscription_id: "sub_fresh"} = pending_intent(business.id)
    assert {:ok, %{paid_seats: 2, pending_checkout: nil}} = Billing.sync_billing(ctx)
    assert %{status: :confirmed} = intent(business.id, request_id)
  end

  test "authenticated provider state never grants paid seats", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 0, status: :free, razorpay_subscription_id: "sub_auth") |> Easy.Repo.update!()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_auth", "quantity" => 3, "status" => "authenticated"})
    end)

    assert {:ok, %{paid_seats: 0, status: :free}} = Billing.sync_billing(ctx)
  end

  test "an ambiguous active update is recovered by GET without another PATCH", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_recover") |> Easy.Repo.update!()
    parent = self()
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      send(parent, {conn.method, conn.request_path})

      case conn.method do
        "PATCH" -> Req.Test.transport_error(conn, :econnrefused)
        "GET" -> Req.Test.json(conn, %{"id" => "sub_recover", "quantity" => 4, "status" => "active"})
      end
    end)

    assert {:error, :razorpay_error} = Billing.checkout(ctx, 1, request_id)
    assert {:ok, %{action: :updated, billing: %{paid_seats: 4}}} = Billing.checkout(ctx, 1, request_id)
    assert_received {"PATCH", "/v1/subscriptions/sub_recover"}
    assert_received {"GET", "/v1/subscriptions/sub_recover"}
    refute_received {"PATCH", "/v1/subscriptions/sub_recover"}
  end

  test "an in-flight update cannot be released by sync", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_held_update") |> Easy.Repo.update!()
    parent = self()
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      if conn.method == "PATCH" do
        send(parent, {:update_started, self()})

        receive do
          :release_update -> :ok
        end
      end

      Req.Test.json(conn, %{"id" => "sub_held_update", "quantity" => 4, "status" => "active"})
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.checkout(ctx, 1, request_id)
      end)

    assert_receive {:update_started, provider}, 1_000
    assert {:ok, %{paid_seats: 4, pending_checkout: %{status: :pending}}} = Billing.sync_billing(ctx)
    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 1, Ecto.UUID.generate())
    send(provider, :release_update)
    assert {:ok, %{billing: %{paid_seats: 4, pending_checkout: nil}}} = Task.await(task)
  end

  test "a delayed sync cannot overwrite a newer completed purchase", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_stale_sync") |> Easy.Repo.update!()
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      quantity =
        if conn.method == "GET" do
          send(parent, {:sync_started, self()})

          receive do
            :release_sync -> 3
          end
        else
          4
        end

      Req.Test.json(conn, %{"id" => "sub_stale_sync", "quantity" => quantity, "status" => "active"})
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.sync_billing(ctx)
      end)

    assert_receive {:sync_started, provider}, 1_000
    assert {:ok, %{billing: %{paid_seats: 4}}} = Billing.checkout(ctx, 1, Ecto.UUID.generate())
    send(provider, :release_sync)
    assert {:ok, %{paid_seats: 4}} = Task.await(task)
  end

  test "the charged webhook confirms a fresh checkout", %{ctx: ctx} do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_webhook_intent", "quantity" => 2, "status" => "created"})
    end)

    assert {:ok, %{action: :checkout}} = Billing.checkout(ctx, 2, Ecto.UUID.generate())

    body =
      Jason.encode!(%{
        "event" => "subscription.charged",
        "payload" => %{"subscription" => %{"entity" => %{"id" => "sub_webhook_intent", "quantity" => 2}}}
      })

    signature = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)
    assert :ok = Billing.handle_razorpay_webhook(body, signature, "evt_intent_#{Ecto.UUID.generate()}")
    assert {:ok, %{paid_seats: 2, pending_checkout: nil, can_add_seats: true}} = Billing.get_billing(ctx)
  end

  test "cancellation blocks overlapping cancellations and purchases", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_cancel_held") |> Easy.Repo.update!()
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      send(parent, {:cancel_started, self()})

      receive do
        :release_cancel -> Req.Test.json(conn, %{"id" => "sub_cancel_held", "status" => "active", "quantity" => 3})
      end
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.cancel(ctx)
      end)

    assert_receive {:cancel_started, provider}, 1_000
    assert {:error, :checkout_in_progress} = Billing.cancel(ctx)
    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 1, Ecto.UUID.generate())
    assert {:ok, %{can_add_seats: false, can_cancel: false, cancellation_state: :requested}} = Billing.get_billing(ctx)
    send(provider, :release_cancel)
    assert {:ok, %{status: :cancel_at_period_end, paid_seats: 3, cancellation_state: nil}} = Task.await(task)
  end

  test "an uncertain cancellation survives reads and can retry only cancellation", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_cancel_retry") |> Easy.Repo.update!()
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)
    assert {:error, :razorpay_error} = Billing.cancel(ctx)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_cancel_retry", "status" => "active", "quantity" => 3})
    end)

    assert {:ok, %{can_add_seats: false, can_cancel: true, cancellation_state: :unknown}} = Billing.sync_billing(ctx)
    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 1, Ecto.UUID.generate())
    assert {:ok, %{status: :cancel_at_period_end, cancellation_state: nil}} = Billing.cancel(ctx)
    assert Repo.aggregate(from(event in Event, where: event.business_id == ^business.id and event.kind == :cancellation_scheduled), :count) == 1
  end

  test "a delayed quantity response cannot restore a cancelled subscription", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_cancelled_update") |> Easy.Repo.update!()
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      send(parent, {:held_update, self()})

      receive do
        :release -> Req.Test.json(conn, %{"id" => "sub_cancelled_update", "status" => "active", "quantity" => 4})
      end
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.checkout(ctx, 1, Ecto.UUID.generate())
      end)

    assert_receive {:held_update, provider}, 1_000
    assert :ok = subscription_webhook("subscription.cancelled", "sub_cancelled_update", 3)
    send(provider, :release)
    assert {:ok, %{billing: %{status: :cancelled, paid_seats: 0, pending_checkout: nil}}} = Task.await(task)
    assert {:ok, %{can_add_seats: true}} = Billing.get_billing(ctx)
  end

  test "late charge and update notifications do not restore terminal seats", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 0, status: :cancelled, razorpay_subscription_id: "sub_terminal") |> Easy.Repo.update!()
    assert :ok = subscription_webhook("subscription.charged", "sub_terminal", 3)
    assert :ok = subscription_webhook("subscription.updated", "sub_terminal", 3)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_terminal", "status" => "active", "quantity" => 3})
    end)

    assert {:ok, %{status: :cancelled, paid_seats: 0}} = Billing.sync_billing(ctx)
  end

  test "an interrupted update recovers provider success without a second PATCH", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_restart") |> Easy.Repo.update!()
    parent = self()
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn _conn ->
      send(parent, :provider_started)

      receive do
        :never -> :ok
      end
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.checkout(ctx, 1, request_id)
      end)

    assert_receive :provider_started, 1_000
    Process.unlink(task.pid)
    Process.exit(task.pid, :kill)
    assert_receive {:DOWN, _, :process, _, :killed}, 1_000
    assert {:error, :checkout_in_progress} = Billing.checkout(ctx, 1, request_id)
    age_checkout(business.id)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "GET"
      Req.Test.json(conn, %{"id" => "sub_restart", "status" => "active", "quantity" => 4})
    end)

    assert {:ok, %{paid_seats: 4, pending_checkout: nil}} = Billing.sync_billing(ctx)
  end

  test "an unapplied interrupted update retries the original absolute target", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_unapplied") |> Easy.Repo.update!()
    request_id = Ecto.UUID.generate()
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)
    assert {:error, :razorpay_error} = Billing.checkout(ctx, 1, request_id)
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      send(parent, conn.method)
      quantity = if conn.method == "GET", do: 3, else: conn.body_params["quantity"]
      Req.Test.json(conn, %{"id" => "sub_unapplied", "status" => "active", "quantity" => quantity})
    end)

    assert {:ok, %{billing: %{paid_seats: 4, pending_checkout: nil}}} = Billing.checkout(ctx, 1, request_id)
    assert_received "GET"
    assert_received "PATCH"
    refute_received "PATCH"
  end

  test "an interrupted cancellation becomes retryable after its request expires", %{business: business, ctx: ctx} do
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_cancel_restart") |> Easy.Repo.update!()
    parent = self()

    Req.Test.stub(Easy.Razorpay, fn _conn ->
      send(parent, :cancellation_started)

      receive do
        :never -> :ok
      end
    end)

    task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        Billing.cancel(ctx)
      end)

    assert_receive :cancellation_started, 1_000
    Process.unlink(task.pid)
    Process.exit(task.pid, :kill)
    assert_receive {:DOWN, _, :process, _, :killed}, 1_000
    assert {:ok, %{can_cancel: false}} = Billing.get_billing(ctx)
    Repo.update_all(from(b in BusinessBilling, where: b.business_id == ^business.id), set: [cancellation_requested_at: DateTime.add(DateTime.utc_now(:second), -121)])
    assert {:ok, %{can_cancel: true, can_add_seats: false}} = Billing.get_billing(ctx)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_cancel_restart", "status" => "active", "quantity" => 3})
    end)

    assert {:ok, %{status: :cancel_at_period_end, paid_seats: 3}} = Billing.cancel(ctx)
  end

  defp age_checkout(business_id) do
    Repo.update_all(from(i in CheckoutIntent, where: i.business_id == ^business_id), set: [updated_at: DateTime.add(DateTime.utc_now(:second), -121)])
  end

  test "support recovery requires the provider's original request reference", %{business: business, ctx: ctx} do
    request_id = Ecto.UUID.generate()

    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.body_params["notes"]["checkout_request_id"] == request_id
      Req.Test.transport_error(conn, :econnrefused)
    end)

    assert {:error, :razorpay_error} = Billing.checkout(ctx, 2, request_id)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{
        "id" => "sub_recovered_create",
        "plan_id" => "plan_test",
        "status" => "created",
        "quantity" => 2,
        "notes" => %{"checkout_request_id" => Ecto.UUID.generate()}
      })
    end)

    assert {:error, :invalid_input} = Billing.recover_checkout(ctx, request_id, "sub_recovered_create")
    assert pending_intent(business.id).subscription_id == nil

    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "GET"
      Req.Test.json(conn, %{"id" => "sub_recovered_create", "plan_id" => "plan_test", "status" => "created", "quantity" => 2, "notes" => %{"checkout_request_id" => request_id}})
    end)

    assert {:error, :not_found} = Billing.recover_checkout(ctx, Ecto.UUID.generate(), "sub_recovered_create")
    assert {:ok, %{action: :checkout, checkout: %{subscription_id: "sub_recovered_create"}}} = Billing.recover_checkout(ctx, request_id, "sub_recovered_create")
    assert {:ok, %{paid_seats: 0, pending_checkout: %{subscription_id: "sub_recovered_create"}}} = Billing.get_billing(ctx)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      Req.Test.json(conn, %{"id" => "sub_recovered_create", "plan_id" => "plan_test", "status" => "active", "quantity" => 2, "notes" => %{"checkout_request_id" => request_id}})
    end)

    result = Billing.recover_checkout(ctx, request_id, "sub_recovered_create")
    assert {:ok, %{action: :updated, billing: %{paid_seats: 2, pending_checkout: nil}}} = result
  end

  defp subscription_webhook(event, subscription_id, quantity) do
    body = Jason.encode!(%{"event" => event, "payload" => %{"subscription" => %{"entity" => %{"id" => subscription_id, "quantity" => quantity}}}})
    signature = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)
    Billing.handle_razorpay_webhook(body, signature, Ecto.UUID.generate())
  end

  defp pending_intent(business_id) do
    Repo.one(from intent in CheckoutIntent, where: intent.business_id == ^business_id and intent.status in [:pending, :unknown])
  end

  defp intent(business_id, request_id), do: Repo.get_by!(CheckoutIntent, business_id: business_id, request_id: request_id)

  defp cleanup(business_id, owner_user_id) do
    Repo.delete_all(from intent in CheckoutIntent, where: intent.business_id == ^business_id)
    Repo.delete_all(from event in Event, where: event.business_id == ^business_id)
    Repo.delete_all(from client in Client, where: client.business_id == ^business_id)
    Repo.delete_all(from billing in BusinessBilling, where: billing.business_id == ^business_id)
    Repo.delete_all(from coach in Coach, where: coach.business_id == ^business_id)
    Repo.delete_all(from business in Business, where: business.id == ^business_id)
    Repo.delete_all(from user in User, where: user.id == ^owner_user_id)
  end
end
