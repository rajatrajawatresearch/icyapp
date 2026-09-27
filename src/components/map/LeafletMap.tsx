import { useEffect, useRef } from "react";
import type { Map as LMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import type { LatLng } from "@/lib/maps";

const DEFAULT_CENTER: LatLng = { lat: 22.9734, lng: 78.6569 }; // India
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * OpenStreetMap via Leaflet (loaded client-side only). With `onPick`, tapping
 * the map or dragging the pin reports the new position.
 */
export function LeafletMap({
  point,
  onPick,
  className = "h-56",
}: {
  point: LatLng | null;
  onPick?: (p: LatLng) => void;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  const editable = Boolean(onPick);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      const start = point ?? DEFAULT_CENTER;
      const m = L.map(el.current, {
        center: [start.lat, start.lng],
        zoom: point ? 16 : 4,
        zoomControl: editable,
        dragging: editable,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer(OSM_TILES, {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      }).addTo(m);
      const icon = L.divIcon({
        className: "",
        html: '<div class="mm-pin"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      marker.current = L.marker([start.lat, start.lng], {
        icon,
        draggable: editable,
        opacity: point ? 1 : 0,
      }).addTo(m);
      if (editable) {
        marker.current.on("dragend", () => {
          const ll = marker.current!.getLatLng();
          onPickRef.current?.({ lat: ll.lat, lng: ll.lng });
        });
        m.on("click", (e) =>
          onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }),
        );
      }
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; `point` changes are handled below
  }, [editable]);

  // Follow external point changes (search result, GPS fix, drag).
  useEffect(() => {
    if (!map.current || !marker.current || !point) return;
    marker.current.setLatLng([point.lat, point.lng]).setOpacity(1);
    const zoom = Math.max(map.current.getZoom(), 16);
    map.current.setView([point.lat, point.lng], zoom, { animate: true });
  }, [point]);

  return (
    <div
      ref={el}
      className={`isolate z-0 w-full overflow-hidden rounded-xl ${className}`}
    />
  );
}
