defmodule Easy.Storage do
  @algorithm "AWS4-HMAC-SHA256"
  @service "s3"
  @request_type "aws4_request"
  @max_expiry 604_800

  @type signed_url :: %{url: String.t(), expires_at: DateTime.t()}

  @spec presign_put(String.t(), keyword()) ::
          {:ok, signed_url()} | {:error, :invalid_expiry | :storage_unavailable}
  def presign_put(storage_key, opts \\ []), do: presign("PUT", storage_key, opts)

  @spec presign_get(String.t(), keyword()) ::
          {:ok, signed_url()} | {:error, :invalid_expiry | :storage_unavailable}
  def presign_get(storage_key, opts \\ []), do: presign("GET", storage_key, opts)

  defp presign(method, storage_key, opts) do
    expires_in = Keyword.get(opts, :expires_in, default_expiry(method))
    now = Keyword.get(opts, :now, DateTime.utc_now(:second))

    with :ok <- validate_expiry(expires_in),
         {:ok, config} <- storage_config() do
      {:ok, build_signed_url(method, storage_key, now, expires_in, config)}
    end
  end

  defp build_signed_url(method, storage_key, now, expires_in, config) do
    endpoint = URI.parse(config.endpoint)
    host = authority(endpoint)
    date_time = Calendar.strftime(now, "%Y%m%dT%H%M%SZ")
    date = Calendar.strftime(now, "%Y%m%d")
    scope = "#{date}/#{config.region}/#{@service}/#{@request_type}"
    canonical_uri = canonical_uri(endpoint.path, config.bucket, storage_key)

    query =
      canonical_query([
        {"X-Amz-Algorithm", @algorithm},
        {"X-Amz-Credential", "#{config.access_key_id}/#{scope}"},
        {"X-Amz-Date", date_time},
        {"X-Amz-Expires", Integer.to_string(expires_in)},
        {"X-Amz-SignedHeaders", "host"}
      ])

    canonical_request =
      [method, canonical_uri, query, "host:#{host}\n", "host", "UNSIGNED-PAYLOAD"]
      |> Enum.join("\n")

    string_to_sign =
      [@algorithm, date_time, scope, sha256_hex(canonical_request)]
      |> Enum.join("\n")

    signature = signing_key(config.secret_access_key, date, config.region) |> hmac(string_to_sign) |> hex()
    base_url = "#{endpoint.scheme}://#{host}#{canonical_uri}"

    %{
      url: "#{base_url}?#{query}&X-Amz-Signature=#{signature}",
      expires_at: DateTime.add(now, expires_in, :second)
    }
  end

  defp storage_config do
    config = Application.get_env(:easy, __MODULE__, [])

    values = %{
      endpoint: Keyword.get(config, :endpoint),
      region: Keyword.get(config, :region),
      bucket: Keyword.get(config, :bucket),
      access_key_id: Keyword.get(config, :access_key_id),
      secret_access_key: Keyword.get(config, :secret_access_key)
    }

    if Enum.all?(values, fn {_key, value} -> is_binary(value) and value != "" end),
      do: {:ok, values},
      else: {:error, :storage_unavailable}
  end

  defp validate_expiry(expires_in) when is_integer(expires_in) and expires_in in 1..@max_expiry, do: :ok
  defp validate_expiry(_expires_in), do: {:error, :invalid_expiry}

  defp default_expiry("PUT"), do: 900
  defp default_expiry("GET"), do: 600

  defp canonical_uri(base_path, bucket, storage_key) do
    [base_path, bucket, storage_key]
    |> Enum.reject(&(&1 in [nil, ""]))
    |> Enum.flat_map(&String.split(&1, "/", trim: true))
    |> Enum.map_join("/", &encode/1)
    |> then(&("/" <> &1))
  end

  defp canonical_query(params) do
    params
    |> Enum.map(fn {key, value} -> {encode(key), encode(value)} end)
    |> Enum.sort()
    |> Enum.map_join("&", fn {key, value} -> "#{key}=#{value}" end)
  end

  defp authority(%URI{host: host, port: nil}), do: host

  defp authority(%URI{scheme: scheme, host: host, port: port}) do
    if URI.default_port(scheme) == port, do: host, else: "#{host}:#{port}"
  end

  defp signing_key(secret, date, region) do
    ("AWS4" <> secret)
    |> hmac(date)
    |> hmac(region)
    |> hmac(@service)
    |> hmac(@request_type)
  end

  defp hmac(key, data), do: :crypto.mac(:hmac, :sha256, key, data)
  defp sha256_hex(data), do: :crypto.hash(:sha256, data) |> hex()
  defp hex(binary), do: Base.encode16(binary, case: :lower)
  defp encode(value), do: URI.encode(value, &unreserved?/1)

  defp unreserved?(char) when char in ?A..?Z, do: true
  defp unreserved?(char) when char in ?a..?z, do: true
  defp unreserved?(char) when char in ?0..?9, do: true
  defp unreserved?(char) when char in [?-, ?_, ?., ?~], do: true
  defp unreserved?(_char), do: false
end
