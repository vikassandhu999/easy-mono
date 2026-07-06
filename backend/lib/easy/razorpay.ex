defmodule Easy.Razorpay do
  @moduledoc """
  Thin Req boundary for the Razorpay subscriptions API.
  Normalizes all failures to {:error, :razorpay_error} (details are logged).
  Docs: https://razorpay.com/docs/api/payments/subscriptions/
  """

  require Logger

  # total_count is mandatory for Razorpay subscriptions; 120 monthly cycles = 10y.
  @total_count 120

  def create_subscription(quantity) do
    request(:post, "/subscriptions", json: %{plan_id: config(:plan_id), quantity: quantity, total_count: @total_count, customer_notify: 1})
  end

  def update_subscription_quantity(subscription_id, quantity) do
    request(:patch, "/subscriptions/#{subscription_id}", json: %{quantity: quantity, schedule_change_at: "now"})
  end

  def cancel_subscription_at_period_end(subscription_id) do
    request(:post, "/subscriptions/#{subscription_id}/cancel", json: %{cancel_at_cycle_end: 1})
  end

  def valid_webhook_signature?(_raw_body, nil), do: false
  def valid_webhook_signature?(nil, _signature), do: false

  def valid_webhook_signature?(raw_body, signature) do
    expected =
      :crypto.mac(:hmac, :sha256, config(:webhook_secret), raw_body)
      |> Base.encode16(case: :lower)

    Plug.Crypto.secure_compare(expected, signature)
  end

  def key_id, do: config(:key_id)

  defp request(method, path, opts) do
    [
      method: method,
      base_url: "https://api.razorpay.com/v1",
      url: path,
      auth: {:basic, "#{config(:key_id)}:#{config(:key_secret)}"}
    ]
    |> Keyword.merge(opts)
    |> Keyword.merge(config(:req_options) || [])
    |> Req.request()
    |> handle_response()
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) when status in 200..299 do
    {:ok, body}
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) do
    Logger.error("razorpay error status=#{status} body=#{inspect(body)}")
    {:error, :razorpay_error}
  end

  defp handle_response({:error, exception}) do
    Logger.error("razorpay transport error: #{inspect(exception)}")
    {:error, :razorpay_error}
  end

  defp config(key), do: Application.get_env(:easy, __MODULE__)[key]
end
