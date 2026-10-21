defmodule Easy.Storage do
  @algorithm "AWS4-HMAC-SHA256"
  @service "s3"
  @request_type "aws4_request"
  @max_expiry 604_800

  @type signed_url :: %{url: String.t(), expires_at: DateTime.t()}
  @type signing_option ::
          {:expires_in, integer()} | {:now, DateTime.t()} | {:store, :private | :public}

  @spec presign_put(String.t(), [signing_option()]) ::
          {:ok, signed_url()} | {:error, :invalid_expiry | :storage_unavailable}
  def presign_put(storage_key, opts \\ []), do: presign("PUT", storage_key, opts)

  @spec presign_get(String.t(), [signing_option()]) ::
          {:ok, signed_url()} | {:error, :invalid_expiry | :storage_unavailable}
  def presign_get(storage_key, opts \\ []), do: presign("GET", storage_key, opts)

  @spec public_url(String.t()) :: {:ok, String.t()} | {:error, :storage_unavailable}
  def public_url(storage_key) do
    with {:ok, origin} <- parse_origin(Keyword.get(config(), :public_url)) do
      encoded_key = storage_key |> String.split("/") |> Enum.map_join("/", &encode/1)
      path = String.trim_trailing(origin.path || "", "/") <> "/" <> encoded_key
      {:ok, URI.to_string(%{origin | path: path})}
    end
  end

  defp presign(method, storage_key, opts) do
    expires_in = Keyword.get(opts, :expires_in, default_expiry(method))
    now = Keyword.get(opts, :now, DateTime.utc_now(:second))
    store = Keyword.get(opts, :store, :private)

    with :ok <- validate_expiry(expires_in),
         {:ok, config} <- storage_config(store) do
      {:ok, build_signed_url(method, storage_key, now, expires_in, config, store)}
    end
  end

  defp build_signed_url(method, storage_key, now, expires_in, config, store) do
    endpoint = config.endpoint
    host = authority(endpoint)
    date_time = Calendar.strftime(now, "%Y%m%dT%H%M%SZ")
    date = Calendar.strftime(now, "%Y%m%d")
    scope = "#{date}/#{config.region}/#{@service}/#{@request_type}"
    canonical_uri = canonical_uri(endpoint.path, config.bucket, storage_key)

    # Public-bucket PUTs sign x-amz-acl=public-read into the URL: S3-compatible
    # stores like DO Spaces keep objects private by default, so without it
    # public_url/1 links would 403.
    acl_params =
      if method == "PUT" and store == :public, do: [{"x-amz-acl", "public-read"}], else: []

    query =
      canonical_query(
        [
          {"X-Amz-Algorithm", @algorithm},
          {"X-Amz-Credential", "#{config.access_key_id}/#{scope}"},
          {"X-Amz-Date", date_time},
          {"X-Amz-Expires", Integer.to_string(expires_in)},
          {"X-Amz-SignedHeaders", "host"}
        ] ++ acl_params
      )

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

  defp storage_config(store) do
    config = config()
    bucket_key = if store == :public, do: :public_bucket, else: :bucket

    values = %{
      endpoint: Keyword.get(config, :endpoint),
      region: Keyword.get(config, :region),
      bucket: Keyword.get(config, bucket_key),
      access_key_id: Keyword.get(config, :access_key_id),
      secret_access_key: Keyword.get(config, :secret_access_key)
    }

    with true <- Enum.all?(values, fn {_key, value} -> is_binary(value) and String.trim(value) != "" end),
         {:ok, endpoint} <- parse_origin(values.endpoint) do
      {:ok, %{values | endpoint: endpoint}}
    else
      _ -> {:error, :storage_unavailable}
    end
  end

  defp parse_origin(value) when is_binary(value) do
    case URI.new(value) do
      {:ok, %URI{scheme: scheme, host: host, port: port, userinfo: nil, query: nil, fragment: nil} = uri}
      when scheme in ["http", "https"] and is_binary(host) and host != "" and port in 1..65_535 ->
        {:ok, uri}

      _ ->
        {:error, :storage_unavailable}
    end
  end

  defp parse_origin(_value), do: {:error, :storage_unavailable}

  defp config, do: Application.get_env(:easy, __MODULE__, [])

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

  defp authority(%URI{scheme: scheme, host: host, port: port}) do
    host = if String.contains?(host, ":"), do: "[#{host}]", else: host
    if is_nil(port) or URI.default_port(scheme) == port, do: host, else: "#{host}:#{port}"
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
  defp encode(value), do: URI.encode(value, &URI.char_unreserved?/1)
end
