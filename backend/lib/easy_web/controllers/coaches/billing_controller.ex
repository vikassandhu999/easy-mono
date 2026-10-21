defmodule EasyWeb.Coaches.BillingController do
  use EasyWeb, :typed_controller

  alias Easy.Billing, as: BillingContext
  alias EasyWeb.Types.{Billing, BillingCheckoutResult}

  typed(:show, ok: {200, data(Billing.t())})
  typed(:checkout, body: Billing.checkout(), ok: {200, data(BillingCheckoutResult.t())})
  typed(:cancel, ok: {200, data(Billing.t())})
  typed(:sync, ok: {200, data(Billing.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, summary} <- BillingContext.get_billing(conn.assigns.ctx) do
      ok(conn, %{data: summary})
    end
  end

  @spec checkout(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def checkout(conn, _params) do
    with {:ok, result} <-
           BillingContext.checkout(conn.assigns.ctx, conn.body_params[:seats_to_add], conn.body_params[:request_id]) do
      ok(conn, %{data: result})
    end
  end

  @spec cancel(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def cancel(conn, _params) do
    with {:ok, summary} <- BillingContext.cancel(conn.assigns.ctx) do
      ok(conn, %{data: summary})
    end
  end

  @spec sync(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def sync(conn, _params) do
    with {:ok, summary} <- BillingContext.sync_billing(conn.assigns.ctx) do
      ok(conn, %{data: summary})
    end
  end
end
