"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./map.css";
import { formatDuration, type RiderTrack } from "@/lib/tracking";

const INDIA: [number, number] = [22.9734, 78.6569];
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Names go into marker HTML, so they are escaped first. */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Every delivery partner on one map: where they are now, today's route, the
 * places they stopped (with minutes) and the pins of orders still to deliver.
 * `focus` zooms to one partner and fades the others.
 */
export function TrackingMap({
  riders,
  focus,
  className = "h-80",
}: {
  riders: RiderTrack[];
  focus: string | null;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const data = useRef({ riders, focus });
  /** What the view was last fitted to, so a refresh doesn't move the map. */
  const fitted = useRef<string | null>(null);

  function draw() {
    const L = leaflet.current;
    const m = map.current;
    const g = layer.current;
    if (!L || !m || !g) return;
    const { riders, focus } = data.current;
    g.clearLayers();
    const inView: [number, number][] = [];

    for (const r of riders) {
      const shown = !focus || focus === r.id;
      if (r.path.length > 1)
        L.polyline(r.path, {
          className: shown ? "mm-route" : "mm-route mm-dim",
          weight: 4,
        }).addTo(g);
      if (shown) {
        for (const s of r.stops)
          L.marker([s.lat, s.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div class="mm-stop">${formatDuration(
                new Date(s.to).getTime() - new Date(s.from).getTime(),
              )}</div>`,
              iconSize: [0, 0],
            }),
          }).addTo(g);
        for (const d of r.deliveries) {
          if (!d.pin || d.delivered) continue;
          L.marker([d.pin.lat, d.pin.lng], {
            icon: L.divIcon({
              className: "",
              html: '<div class="mm-pin"></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 30],
            }),
          })
            .bindTooltip(`#${d.number} ${esc(d.customerName)}`)
            .addTo(g);
          inView.push([d.pin.lat, d.pin.lng]);
        }
        inView.push(...r.path);
      }
      if (r.last) {
        L.marker([r.last.lat, r.last.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="mm-rider${shown ? "" : " mm-dim"}"><span></span>${esc(r.name)}</div>`,
            iconSize: [0, 0],
          }),
          zIndexOffset: 1000,
        }).addTo(g);
        if (shown) inView.push([r.last.lat, r.last.lng]);
      }
    }

    const view = `${focus ?? "all"}:${inView.length > 0}`;
    if (inView.length && fitted.current !== view) {
      m.fitBounds(inView, { padding: [44, 44], maxZoom: 17 });
      fitted.current = view;
    }
  }

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, {
        center: INDIA,
        zoom: 4,
        scrollWheelZoom: false,
      });
      L.tileLayer(OSM_TILES, {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
        referrerPolicy: "origin",
      }).addTo(m);
      leaflet.current = L;
      map.current = m;
      layer.current = L.layerGroup().addTo(m);
      draw();
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    data.current = { riders, focus };
    draw();
  }, [riders, focus]);

  return (
    <div
      ref={el}
      className={`isolate z-0 w-full overflow-hidden rounded-2xl border border-line ${className}`}
    />
  );
}
