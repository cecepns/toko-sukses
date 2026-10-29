import { useCallback, useEffect, useState } from "react";
import { get, getErrorMessage } from "@/utils/request";

const EMPTY = { page: 1, limit: 10, total: 0, totalPages: 1 };

/** State list standar: pagination dari backend, search, limit, sort, filter. */
export function useList(url, { fixed = {}, reloadKey = 0 } = {}) {
  const [query, setQuery] = useState({ page: 1, limit: 10, search: "" });
  const [state, setState] = useState({ rows: [], pagination: EMPTY, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const fixedKey = JSON.stringify(fixed);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = Object.fromEntries(
      Object.entries({ ...query, ...fixed }).filter(([, v]) => v !== "" && v !== undefined && v !== null)
    );
    get(url, params, { silent: true })
      .then((r) => alive && setState({ rows: r.data, pagination: r.pagination, loading: false, error: null }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: getErrorMessage(e) })));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, query, fixedKey, tick, reloadKey]);

  const patch = useCallback((p) => setQuery((q) => ({ ...q, page: 1, ...p })), []);

  return {
    ...state,
    query,
    setPage: (page) => setQuery((q) => ({ ...q, page })),
    setLimit: (limit) => patch({ limit }),
    setSearch: (search) => patch({ search }),
    setFilter: (key, value) => patch({ [key]: value }),
    setSort: (key) => setQuery((q) => ({ ...q, page: 1, sortBy: key, order: q.sortBy === key && q.order === "asc" ? "desc" : "asc" })),
    reload: () => setTick((t) => t + 1),
  };
}
