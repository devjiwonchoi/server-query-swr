import 'server-only';

import { getServerReferenceId } from './server-reference-id';

type ServerQueryLoader<T, PageParams = Record<string, string>> = (args: {
  params: PageParams | Promise<PageParams>;
}) => Promise<T>;

export interface ServerQuery<T, PageParams = Record<string, string>> {
  /** The loader's server-reference id, used as the params-blind part of the key. */
  id: string;
  /** In-flight server fetch, awaited on the client for the first paint. */
  initialData: Promise<T>;
  /** The server loader, re-invoked on the client by SWR to revalidate. */
  loader: ServerQueryLoader<T, PageParams>;
}

export function queryServer<T, PageParams = Record<string, string>>({
  loader,
  params,
}: {
  loader: ServerQueryLoader<T, PageParams>;
  params: PageParams | Promise<PageParams>;
}): ServerQuery<T, PageParams> {
  return {
    id: getServerReferenceId(loader),
    initialData: loader({ params }),
    loader,
  };
}
