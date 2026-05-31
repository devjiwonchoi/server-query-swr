'use client';

import type { SWRConfiguration, SWRResponse } from 'swr';
import type { ServerQuery } from './query-server';

import useSWR, { preload, unstable_serialize } from 'swr';
import { useParams } from 'next/navigation';

export type ServerSWRResponse<T> = Omit<SWRResponse<T, Error>, 'data'> & {
  data: T;
};

export function useServerQuerySWR<T, PageParams = Record<string, string>>(
  query: ServerQuery<T, PageParams>,
  options?: Omit<SWRConfiguration<T, Error>, 'suspense'>,
): ServerSWRResponse<T> {
  const params = useParams() as PageParams;
  const key = unstable_serialize([query.id, params]);

  preload(key, () => query.initialData);

  const swr = useSWR<T, Error>(key, () => query.loader({ params }), {
    ...options,
    suspense: true,
    fallback: { [key]: query.initialData },
  });

  return swr as ServerSWRResponse<T>;
}
