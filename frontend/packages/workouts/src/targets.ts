import {type MetricKey, metricCatalogue} from './metrics.ts';

export type Target = {
  mode: 'client_chooses' | 'exact' | 'range' | 'max';
  value?: number | string;
  min?: number;
  max?: number;
};

export type RestTarget = {
  mode: 'client_chooses' | 'none' | 'exact' | 'range';
  value_s?: number;
  min_s?: number;
  max_s?: number;
};

export function formatRest(rest: RestTarget): string {
  switch (rest.mode) {
    case 'client_chooses':
      return 'Any';
    case 'none':
      return 'None';
    case 'exact':
      return clock(rest.value_s);
    case 'range':
      return `${clock(rest.min_s)}–${clock(rest.max_s)}`;
  }
}

export function formatTarget(metric: MetricKey | 'grade', target: Target | null | undefined): string {
  if (!target || target.mode === 'client_chooses') {
    return 'Any';
  }
  if (target.mode === 'max') {
    return 'Max';
  }
  if (metric === 'duration') {
    return target.mode === 'range' ? `${duration(target.min)}–${duration(target.max)}` : duration(target.value);
  }
  if (metric === 'distance') {
    return target.mode === 'range' ? distance(target.min, target.max) : distance(target.value);
  }
  const value = target.mode === 'range' ? `${target.min ?? '–'}–${target.max ?? '–'}` : String(target.value ?? '–');
  if (metric === 'result') {
    return {win: 'Win', draw: 'Draw', loss: 'Loss'}[value as 'win' | 'draw' | 'loss'] ?? value;
  }
  const unit = metric === 'grade' ? '' : metricCatalogue[metric].unit;
  const showUnit = unit && !['reps', 'count', 'points', 'RPE 1–10', 'RIR 0–10'].includes(unit);
  return `${value}${showUnit ? ` ${unit}` : ''}`;
}

export function targetModes(metric: MetricKey | 'grade'): readonly Target['mode'][] {
  return metric === 'result' || metric === 'tempo' || metric === 'grade'
    ? ['client_chooses', 'exact']
    : ['client_chooses', 'exact', 'range', 'max'];
}

// The value an input shows as its hint. It uses the input's own unit and never becomes a result.
export function targetPlaceholder(metric: MetricKey, target: Target | null | undefined): string {
  if (!target || target.mode === 'client_chooses') {
    return '';
  }
  if (target.mode === 'max') {
    return 'Max';
  }
  const show = (value: number | string | undefined) =>
    value === undefined ? '' : metric === 'duration' && Number(value) >= 60 ? clock(Number(value)) : String(value);
  return target.mode === 'range' ? `${show(target.min)}–${show(target.max)}` : show(target.value);
}

// Metres below 1 km, kilometres from 1 km, so 5000 reads as "5 km".
function distance(...values: (number | string | undefined)[]): string {
  const metres = values.map((value) => (value === undefined ? Number.NaN : Number(value)));
  const km = metres.every((value) => value >= 1000);
  const text = metres.map((value) => (Number.isNaN(value) ? '–' : String(km ? value / 1000 : value))).join('–');
  return `${text} ${km ? 'km' : 'm'}`;
}

function duration(value: number | string | undefined): string {
  if (value === undefined) {
    return '–';
  }
  const seconds = Number(value);
  return seconds < 60 ? `${seconds} s` : clock(seconds);
}

function clock(value: number | undefined): string {
  if (value === undefined) {
    return '–';
  }
  const [whole = '0', fraction] = String(value).split('.');
  const seconds = Number(whole);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}${fraction ? `.${fraction}` : ''}`;
}
