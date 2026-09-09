defmodule Easy.Razorpay do
  require Logger

  alias Easy.Razorpay.Payload

  # total_count is mandatory for Razorpay subscriptions; 120 monthly cycles = 10y.
  @total_count 120

  @spec create_subscription(pos_integer()) :: {:ok, Payload.subscription()} | {:error, :razorpay_error}
  def create_subscription(quantity) do
    request(:post, "/subscriptions",
      json: %{
        plan_id: config(:plan_id),
        quantity: quantity,
        total_count: @total_count,
        customer_notify: 1
      }
    )
  end

  @spec get_subscription(String.t()) :: {:ok, Payload.subscription()} | {:error, :razorpay_error}
  def get_subscription(subscription_id) do
    request(:get, "/subscriptions/#{subscription_id}", [], subscription_id)
  end

  @spec update_subscription_quantity(String.t(), pos_integer()) ::
          {:ok, Payload.subscription()} | {:error, :razorpay_error}
  def update_subscription_quantity(subscription_id, quantity) do
    request(
      :patch,
      "/subscriptions/#{subscription_id}",
      [json: %{quantity: quantity, schedule_change_at: "now"}],
      subscription_id
    )
  end

  @spec cancel_subscription_at_period_end(String.t()) ::
          {:ok, Payload.subscription()} | {:error, :razorpay_error}
  def cancel_subscription_at_period_end(subscription_id) do
    request(:post, "/subscriptions/#{subscription_id}/cancel", [json: %{cancel_at_cycle_end: 1}], subscription_id)
  end

  @spec valid_webhook_signature?(binary() | nil, String.t() | nil) :: boolean()
  def valid_webhook_signature?(_raw_body, nil), do: false
  def valid_webhook_signature?(nil, _signature), do: false

  def valid_webhook_signature?(raw_body, signature) do
    case config(:webhook_secret) do
      secret when is_binary(secret) and secret != "" ->
        expected =
          :crypto.mac(:hmac, :sha256, secret, raw_body)
          |> Base.encode16(case: :lower)

        Plug.Crypto.secure_compare(expected, signature)

      _ ->
        false
    end
  end

  @spec key_id() :: String.t() | nil
  def key_id, do: config(:key_id)

  defp request(method, path, opts, expected_id \\ nil) do
    [
      method: method,
      base_url: "https://api.razorpay.com/v1",
      url: path,
      auth: {:basic, "#{config(:key_id)}:#{config(:key_secret)}"}
    ]
    |> Keyword.merge(opts)
    |> Keyword.merge(config(:req_options) || [])
    |> Req.request()
    |> handle_response(expected_id)
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}, expected_id)
       when status in 200..299 and is_map(body) do
    if Payload.valid_subscription?(body) and (is_nil(expected_id) or body["id"] == expected_id) do
      {:ok, Payload.subscription_values(body)}
    else
      Logger.error("razorpay invalid subscription response status=#{status}")
      {:error, :razorpay_error}
    end
  end

  defp handle_response({:ok, %Req.Response{status: status}}, _expected_id) do
    Logger.error("razorpay unexpected response status=#{status}")
    {:error, :razorpay_error}
  end

  defp handle_response({:error, exception}, _expected_id) do
    Logger.error("razorpay transport error: #{inspect(exception)}")
    {:error, :razorpay_error}
  end

  defp config(key), do: Application.get_env(:easy, __MODULE__)[key]
end
