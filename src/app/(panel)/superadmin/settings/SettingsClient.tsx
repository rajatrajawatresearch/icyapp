"use client";

import { useState } from "react";
import type { PickupLocation } from "@/lib/settings";
import { api, errorMessage } from "@/lib/client-api";
import { googleMapsUrl, type LatLng } from "@/lib/maps";
import { LocationPicker } from "@/components/map/LocationPicker";
import { btnPrimary, btnSecondary, card, input, label } from "@/components/ui";

export function SettingsClient({ initial }: { initial: PickupLocation }) {
  const [address, setAddress] = useState(initial.address ?? "");
  const [point, setPoint] = useState<LatLng | null>(
    initial.lat !== null && initial.lng !== null
      ? { lat: initial.lat, lng: initial.lng }
      : null,
  );
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"save" | "link" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function useLink() {
    setBusy("link");
    setMessage(null);
    try {
      const p = await api<LatLng>("/api/superadmin/settings", {
        method: "POST",
        json: { link },
      });
      setPoint(p);
      setLink("");
      setMessage({
        ok: true,
        text: "Location taken from Google Maps — check the pin, then Save.",
      });
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setMessage(null);
    try {
      await api("/api/superadmin/settings", {
        method: "PUT",
        json: { address, lat: point?.lat ?? null, lng: point?.lng ?? null },
      });
      setMessage({ ok: true, text: "Pickup location saved" });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <form onSubmit={save} className={`${card} mt-4 space-y-4 p-4`}>
      <h2 className="font-semibold text-ink">Pickup location</h2>

      <div>
        <label className={label} htmlFor="gmaps-link">
          Paste a Google Maps link (optional)
        </label>
        <div className="flex gap-2">
          <input
            id="gmaps-link"
            className={input}
            placeholder="https://maps.app.goo.gl/…  or  12.9716, 77.5946"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button
            type="button"
            className={btnSecondary}
            onClick={useLink}
            disabled={!link.trim() || busy !== null}
          >
            {busy === "link" ? "Reading…" : "Use"}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-3">
          In Google Maps, open your shop, tap Share, then Copy link.
        </p>
      </div>

      <div>
        <p className={label}>Or find it here</p>
        <LocationPicker
          value={point}
          onChange={setPoint}
          onAddress={(a) => !address.trim() && setAddress(a)}
        />
      </div>

      <div>
        <label className={label} htmlFor="pickup-address">
          Pickup address shown to customers
        </label>
        <textarea
          id="pickup-address"
          rows={3}
          required
          className={input}
          placeholder="Shop name, street, landmark, city"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {point && (
        <a
          href={googleMapsUrl(point)}
          target="_blank"
          rel="noreferrer"
          className="block text-sm font-semibold text-brand-700"
        >
          Check this pin in Google Maps
        </a>
      )}

      {message && (
        <p
          className={`text-sm ${message.ok ? "text-success-ink" : "text-danger-ink"}`}
        >
          {message.text}
        </p>
      )}
      <button
        type="submit"
        className={`${btnPrimary} w-full py-3`}
        disabled={busy !== null}
      >
        {busy === "save" ? "Saving…" : "Save pickup location"}
      </button>
    </form>
  );
}
