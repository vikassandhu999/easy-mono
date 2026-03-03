const roundToDecimals = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const parseOptionalNumber = (value: string, decimals = 1): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return roundToDecimals(parsed, decimals);
};

export const toStringValue = (value: null | number | string | undefined): string => {
  return value === null || value === undefined ? '' : String(value);
};

export const roundToOneDecimal = (value: number): number => {
  return roundToDecimals(value, 1);
};
