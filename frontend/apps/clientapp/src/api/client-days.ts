import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {dayKeys} from './keys';
import type {paths} from './schema';
export type ClientDay = paths['/v1/client/days/{date}']['get']['responses'][200]['content']['application/json']['data'];
export function useClientDay(date: string) {
  return useQuery({
    queryKey: dayKeys.detail(date),
    enabled: Boolean(date),
    queryFn: ({signal}) => call(client.GET('/v1/client/days/{date}', {params: {path: {date}}, signal})),
  });
}
export function useWeekMarkers(from: string) {
  return useQuery({
    queryKey: dayKeys.week(from),
    enabled: Boolean(from),
    queryFn: ({signal}) => call(client.GET('/v1/client/week-markers', {params: {query: {from}}, signal})),
  });
}
