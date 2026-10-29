import { useEffect, useState } from "react";
import { get } from "@/utils/request";

export function useOptions(endpoint) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    get(endpoint, { limit: 100, sortBy: "name", order: "asc" }, { silent: true })
      .then((r) => alive && setRows(r.data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [endpoint]);
  return { rows, loading };
}
