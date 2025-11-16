defmodule Easy.Utils do
  import Ecto.Query, only: [from: 2]
  require Logger

  def utc_yesterday() do
    utc_days_ago(1)
  end

  def utc_days_ago(days) do
    {today, _time} = :calendar.universal_time()

    today
    |> :calendar.date_to_gregorian_days()
    |> Kernel.-(days)
    |> :calendar.gregorian_days_to_date()
    |> Date.from_erl!()
  end

  def safe_to_atom(binary, allowed) when is_binary(binary) do
    if binary in allowed, do: String.to_atom(binary)
  end

  def safe_to_atom(_, _), do: nil

  def safe_date(nil), do: nil

  def safe_date(string) when is_binary(string) do
    case Date.from_iso8601(string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  def safe_date(_), do: nil

  def safe_page(page, _count, _per_page) when page < 1 do
    1
  end

  def safe_page(page, count, per_page) when page > div(count, per_page) + 1 do
    div(count, per_page) + 1
  end

  def safe_page(page, _count, _per_page) do
    page
  end

  def safe_int(nil), do: nil

  def safe_int(string) when is_binary(string) do
    case Integer.parse(string) do
      {int, ""} -> int
      _ -> nil
    end
  end

  def safe_int(_), do: nil

  def parse_search(nil), do: nil
  def parse_search(""), do: nil
  def parse_search(search), do: String.trim(search)

  defp diff(a, b) do
    {days, time} = :calendar.time_difference(a, b)
    :calendar.time_to_seconds(time) - days * 24 * 60 * 60
  end

  @doc """
  Determine if a given timestamp is less than a day (86400 seconds) old
  """
  def within_last_day?(nil), do: false

  def within_last_day?(a) do
    diff = diff(NaiveDateTime.to_erl(a), :calendar.universal_time())

    diff < 24 * 60 * 60
  end

  def binarify(term, opts \\ [])

  def binarify(binary, _opts) when is_binary(binary), do: binary
  def binarify(number, _opts) when is_number(number), do: number
  def binarify(atom, _opts) when is_nil(atom) or is_boolean(atom), do: atom
  def binarify(atom, _opts) when is_atom(atom), do: Atom.to_string(atom)
  def binarify(list, opts) when is_list(list), do: for(elem <- list, do: binarify(elem, opts))
  def binarify(%Version{} = version, _opts), do: to_string(version)

  def binarify(%DateTime{} = dt, _opts),
    do: dt |> DateTime.truncate(:second) |> DateTime.to_iso8601()

  def binarify(%NaiveDateTime{} = ndt, _opts),
    do: ndt |> NaiveDateTime.truncate(:second) |> NaiveDateTime.to_iso8601()

  def binarify(%{__struct__: atom}, _opts) when is_atom(atom),
    do: raise("not able to binarify %#{inspect(atom)}{}")

  def binarify(tuple, opts) when is_tuple(tuple),
    do: for(elem <- Tuple.to_list(tuple), do: binarify(elem, opts)) |> List.to_tuple()

  def binarify(map, opts) when is_map(map) do
    if Keyword.get(opts, :maps, true) do
      for(elem <- map, into: %{}, do: binarify(elem, opts))
    else
      for(elem <- map, do: binarify(elem, opts))
    end
  end

  def paginate(query, page, count) when is_integer(page) and page > 0 do
    offset = (page - 1) * count

    from(
      var in query,
      offset: ^offset,
      limit: ^count
    )
  end

  def paginate(query, _page, count) do
    paginate(query, 1, count)
  end

  def parse_ip(ip) do
    parts = String.split(ip, ".")

    if length(parts) == 4 do
      parts = Enum.map(parts, &String.to_integer/1)
      for part <- parts, into: <<>>, do: <<part>>
    end
  end

  def parse_ip_mask(string) do
    case String.split(string, "/") do
      [ip, mask] -> {Hexpm.Utils.parse_ip(ip), String.to_integer(mask)}
      [ip] -> {Hexpm.Utils.parse_ip(ip), 32}
    end
  end

  def in_ip_range?(_range, nil) do
    false
  end

  def in_ip_range?(list, ip) when is_list(list) do
    Enum.any?(list, &in_ip_range?(&1, ip))
  end

  def in_ip_range?({range, mask}, ip) do
    <<range::bitstring-size(mask)>> == <<ip::bitstring-size(mask)>>
  end

  def previous_version(version, all_versions) do
    case Enum.find_index(all_versions, &(&1 == version)) do
      nil -> nil
      version_index -> Enum.at(all_versions, version_index + 1)
    end
  end

  def diff_html_url(package_name, version, previous_version) do
    diff_url = Application.fetch_env!(:hexpm, :diff_url)
    "#{diff_url}/diff/#{package_name}/#{previous_version}..#{version}"
  end

  def preview_html_url(package_name, version) do
    preview_url = Application.fetch_env!(:hexpm, :preview_url)
    "#{preview_url}/preview/#{package_name}/#{version}"
  end

  @doc """
  Returns a RFC 2822 format string from a UTC datetime.
  """
  def datetime_to_rfc2822(%DateTime{calendar: Calendar.ISO, time_zone: "Etc/UTC"} = datetime) do
    Calendar.strftime(datetime, "%a, %d %b %Y %H:%M:%S GMT")
  end
end
