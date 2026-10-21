defmodule Easy.Billing.Webhook do
  alias Easy.Billing.WebhookReceipt
  alias Easy.Razorpay
  alias Easy.Razorpay.Payload
  alias Easy.Repo

  @type error ::
          :invalid_webhook_signature
          | :duplicate_webhook
          | :invalid_webhook_payload
          | :not_found
          | Ecto.Changeset.t()
  @type handler :: (Payload.webhook() -> :ok | {:error, error()})

  @spec handle(binary(), String.t() | nil, String.t() | nil, handler()) :: :ok | {:error, error()}
  def handle(raw_body, signature, event_id, apply_event) do
    with true <- Razorpay.valid_webhook_signature?(raw_body, signature),
         {:ok, params} <- Jason.decode(raw_body),
         {:ok, webhook} <- Payload.parse_webhook(params) do
      claim_and_apply(event_id || fallback_event_id(raw_body), webhook, apply_event)
    else
      false -> {:error, :invalid_webhook_signature}
      {:error, :invalid_webhook_payload} = error -> error
      {:error, %Jason.DecodeError{}} -> {:error, :invalid_webhook_signature}
    end
  end

  # Receipt and local writes share a transaction so a failed application leaves
  # the event id available for retry. Payload validation happens before this boundary.
  defp claim_and_apply(event_id, webhook, apply_event) do
    Repo.transact(fn ->
      with :ok <- claim_receipt(event_id, webhook.event),
           :ok <- apply_event.(webhook) do
        {:ok, :ok}
      end
    end)
    |> case do
      {:ok, :ok} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp claim_receipt(event_id, event_type) do
    {count, _} =
      Repo.insert_all(
        WebhookReceipt,
        [
          %{
            id: Ecto.UUID.generate(),
            razorpay_event_id: event_id,
            event_type: event_type || "unknown",
            processed_at: DateTime.utc_now(:second),
            inserted_at: DateTime.utc_now(:second)
          }
        ],
        on_conflict: :nothing,
        conflict_target: [:razorpay_event_id]
      )

    if count == 1, do: :ok, else: {:error, :duplicate_webhook}
  end

  defp fallback_event_id(raw_body), do: "sha:" <> Base.encode16(:crypto.hash(:sha256, raw_body), case: :lower)
end
