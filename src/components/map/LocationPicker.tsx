import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { api, errorMessage } from "@/lib/client-api";
import type { LatLng } from "@/lib/maps";
import { input } from "@/components/ui";

const LeafletMap = dynamic(
  () => import("./LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-xl bg-gray-100" />
    ),
  },
);

type GeoResult = { label: string; lat: number; lng: number };

/**
 * Search a place, use GPS, or drag the pin. Reports the point via onChange and
 * a human-readable address for it via onAddress (reverse geocoded).
 */
export function LocationPicker({
  value,
  onChange,
  onAddress,
  near,
  placeholder = "Search area, street or landmark",
}: {
  value: LatLng | null;
  onChange: (p: LatLng | null) => void;
  onAddress?: (label: string) => void;
  near?: LatLng | null;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  // Debounced search (the free geocoder asks for gentle usage).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (near) {
          params.set("lat", String(near.lat));
          params.set("lng", String(near.lng));
        }
        const data = await api<{ results: GeoResult[] }>(
          `/api/geo/search?${params}`,
        );
        if (id === reqId.current) setResults(data.results);
      } catch (e) {
        if (id === reqId.current) setError(errorMessage(e));
      } finally {
        if (id === reqId.current) setSearching(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [query, near]);

  async function lookupAddress(p: LatLng) {
    if (!onAddress) return;
    try {
      const data = await api<{ result: GeoResult | null }>(
        `/api/geo/reverse?lat=${p.lat}&lng=${p.lng}`,
      );
      if (data.result?.label) onAddress(data.result.label);
    } catch {
      // Address lookup is a convenience; the pin itself is what matters.
    }
  }

  function pick(p: LatLng, label?: string) {
    setError(null);
    onChange(p);
    if (label && onAddress) onAddress(label);
    else lookupAddress(p);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available on this device");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it in browser settings, or search instead"
            : "Couldn't get your location — try again or search instead",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={locating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-50 py-3 text-sm font-semibold text-brand-700 active:opacity-70 disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="currentColor"
          aria-hidden
        >
          <path d="M21 3 3 10.5l7.5 3L13.5 21z" />
        </svg>
        {locating ? "Finding you…" : "Use my current location"}
      </button>

      <div className="relative">
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          className={input}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 3) setResults([]);
          }}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            …
          </span>
        )}
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-surface shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 active:bg-gray-100"
                  onClick={() => {
                    setResults([]);
                    setQuery("");
                    pick({ lat: r.lat, lng: r.lng }, r.label);
                  }}
                >
                  {r.label || `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <LeafletMap point={value} onPick={(p) => pick(p)} />
      <p className="text-xs text-gray-500">
        {value
          ? "Drag the pin or tap the map to fine-tune."
          : "Tap the map to drop a pin."}
        {value && (
          <button
            type="button"
            className="ml-2 text-brand-700 underline"
            onClick={() => onChange(null)}
          >
            Clear pin
          </button>
        )}
      </p>
    </div>
  );
}
