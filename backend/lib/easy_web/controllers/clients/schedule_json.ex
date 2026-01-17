defmodule EasyWeb.Clients.ScheduleJSON do
  @moduledoc """
  JSON views for client schedule endpoints.

  These endpoints are computed-on-read for MVP and return a merged schedule
  containing training and nutrition sections (either may be empty).

  Expected assigns:
  - `:result` for both `next/1` and `week/1`
  """

  alias EasyWeb.ResponseHelpers

  @doc """
  Renders a weekly schedule (Mon..Sun).

  Shape (example):

      %{
        data: %{
          week_start: "YYYY-MM-DD",
          week_end: "YYYY-MM-DD",
          days: [
            %{
              date: "YYYY-MM-DD",
              weekday: 1,
              training: %{items: [...]},
              nutrition: %{items: [...]}
            }
          ]
        }
      }

  Training Item

    %{
      training : %{
        items : {

        }
      }
    }

  """
  def week(%{result: result}) do
    days = Map.get(result, :days, []) || []

    %{
      data: %{
        week_start: format_date(Map.get(result, :week_start)),
        week_end: format_date(Map.get(result, :week_end)),
        days: Enum.map(days, &format_day/1)
      }
    }
  end

  # ===========================================================================
  # Private helpers
  # ===========================================================================

  defp format_next_item(nil), do: nil

  defp format_next_item(item) when is_map(item) do
    %{
      kind: map_get_string(item, :kind),
      date: format_date(Map.get(item, :date)),
      status: map_get_string(item, :status),
      title: map_get_string(item, :title),
      subtitle: map_get_string(item, :subtitle),
      entity: format_entity(Map.get(item, :entity))
    }
  end

  defp format_day(day) when is_map(day) do
    %{
      date: format_date(Map.get(day, :date)),
      weekday: Map.get(day, :weekday),
      training: format_section(Map.get(day, :training)),
      nutrition: format_section(Map.get(day, :nutrition))
    }
  end

  defp format_section(nil), do: %{items: []}

  defp format_section(section) when is_map(section) do
    items = Map.get(section, :items, []) || []

    %{
      items: Enum.map(items, &format_schedule_item/1)
    }
    |> maybe_put(:meta, Map.get(section, :meta))
  end

  defp format_schedule_item(item) when is_map(item) do
    %{
      kind: map_get_string(item, :kind),
      date: format_date(Map.get(item, :date)),
      status: map_get_string(item, :status),
      title: map_get_string(item, :title),
      subtitle: map_get_string(item, :subtitle),
      entity: format_entity(Map.get(item, :entity))
    }
    |> maybe_put(:cta, Map.get(item, :cta))
  end

  # Allow entity to be either a plain map or an Ecto struct.
  # For structs, we provide a tiny default rendering (id + type if possible).
  defp format_entity(nil), do: nil

  defp format_entity(%{__struct__: _} = struct) do
    base = %{
      id: ResponseHelpers.format_uuid(Map.get(struct, :id)),
      type: struct.__struct__ |> Module.split() |> List.last()
    }

    # If the struct has a name/title-like field, include it.
    base
    |> maybe_put(:name, Map.get(struct, :name))
    |> maybe_put(:title, Map.get(struct, :title))
  end

  defp format_entity(map) when is_map(map), do: map

  defp format_date(nil), do: nil
  defp format_date(%Date{} = date), do: Date.to_iso8601(date)

  defp map_get_string(map, key) when is_map(map) do
    case Map.get(map, key) do
      nil -> nil
      value when is_binary(value) -> value
      value -> to_string(value)
    end
  end

  defp maybe_put(map, _key, nil), do: map

  defp maybe_put(map, key, value) do
    Map.put(map, key, value)
  end
end
