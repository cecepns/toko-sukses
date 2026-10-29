import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { get } from "@/utils/request";

const defaultStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "38px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#6366f1" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 2px #c7d2fe" : "none",
    fontSize: "0.875rem",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "white",
    "&:hover": {
      borderColor: state.isFocused ? "#6366f1" : "#94a3b8",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 10px",
  }),
  input: (base) => ({
    ...base,
    margin: "0",
    padding: "0",
    color: "#1e293b",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94a3b8",
    fontSize: "0.875rem",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#1e293b",
    fontSize: "0.875rem",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    fontSize: "0.875rem",
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#4f46e5"
      : state.isFocused
      ? "#eef2ff"
      : "transparent",
    color: state.isSelected ? "white" : "#1e293b",
    fontSize: "0.875rem",
    cursor: "pointer",
    padding: "8px 12px",
    "&:active": {
      backgroundColor: "#e0e7ff",
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: "0.875rem",
    color: "#64748b",
  }),
  loadingMessage: (base) => ({
    ...base,
    fontSize: "0.875rem",
    color: "#64748b",
  }),
};

export default function RemoteSelect({
  endpoint,
  getLabel = (r) => r.name,
  getValue = (r) => r.id,
  formatOptionLabel,
  value,
  onChange,
  placeholder = "Cari & pilih...",
  isClearable = true,
  isDisabled = false,
  className = "",
  params = {},
  debounceMs = 350,
}) {
  const optionsCache = useRef(new Map());
  const timerRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState(null);

  // Fungsi load options dengan debounce pencarian ke API
  const loadOptions = useCallback(
    (inputValue, callback) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        try {
          const res = await get(
            endpoint,
            { search: inputValue ? inputValue.trim() : undefined, limit: 50, ...params },
            { silent: true }
          );
          const list = res?.data || [];
          const opts = list.map((item) => {
            const opt = {
              value: getValue(item),
              label: getLabel(item),
              raw: item,
            };
            optionsCache.current.set(String(opt.value), opt);
            return opt;
          });
          callback(opts);
        } catch {
          callback([]);
        }
      }, debounceMs);
    },
    [endpoint, params, getLabel, getValue, debounceMs]
  );

  // Sinkronisasi value terpilih ke opsi react-select
  useEffect(() => {
    let alive = true;
    if (value === undefined || value === null || value === "") {
      setSelectedOption(null);
      return;
    }

    const valKey = String(typeof value === "object" ? value.value : value);

    if (optionsCache.current.has(valKey)) {
      setSelectedOption(optionsCache.current.get(valKey));
      return;
    }

    // Jika value belum ada di cache, muat opsi awal untuk mendapatkan label
    get(endpoint, { limit: 50, ...params }, { silent: true })
      .then((res) => {
        if (!alive) return;
        const list = res?.data || [];
        list.forEach((item) => {
          const opt = {
            value: getValue(item),
            label: getLabel(item),
            raw: item,
          };
          optionsCache.current.set(String(opt.value), opt);
        });

        if (optionsCache.current.has(valKey)) {
          setSelectedOption(optionsCache.current.get(valKey));
        } else if (typeof value === "object" && value?.label) {
          setSelectedOption(value);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [value, endpoint, params, getLabel, getValue]);

  const handleChange = (selected) => {
    setSelectedOption(selected);
    if (onChange) {
      onChange(selected ? selected.value : "", selected ? selected.raw : null);
    }
  };

  return (
    <div className={`remote-select-container ${className}`}>
      <AsyncSelect
        cacheOptions
        defaultOptions
        loadOptions={loadOptions}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isClearable={isClearable}
        isDisabled={isDisabled}
        styles={defaultStyles}
        formatOptionLabel={formatOptionLabel}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        loadingMessage={() => "Mencari data..."}
        noOptionsMessage={() => "Data tidak ditemukan"}
      />
    </div>
  );
}
