export const DEFAULT_LIMIT = 50;

export type PaginationOpts = {
  page?: number;
  per_page?: number;
  [key: string]: unknown;
};

export type PaginationMeta = {
  offset: number;
  limit: number;
  total: number;
};

export type PaginatedList<T> = {
  meta: PaginationMeta;
  records: T[];
};

export const buildListParams = (opts: PaginationOpts, pageParam: number, defaultLimit = DEFAULT_LIMIT) => {
  const limit = opts.per_page ?? defaultLimit;
  const offset = pageParam;

  const params: Record<string, unknown> = {
    ...opts,
    limit,
    offset,
  };

  // Remove per_page as we're using limit/offset
  delete params.per_page;
  delete params.page;

  return params;
};

export const getNextPage = <T extends {meta: PaginationMeta}>(lastPage: T) => {
  const {offset, limit, total} = lastPage.meta;

  if (!total || total <= 0) {
    return undefined;
  }

  const nextOffset = offset + limit;

  if (nextOffset >= total) {
    return undefined;
  }

  return nextOffset;
};
