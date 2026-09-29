"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Pharmacy } from "@/lib/types";

const icon = (garde: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${garde ? "#f26b4f" : "#2f8f5b"};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

type Props = {
  pharmacies: Pharmacy[];
  center: { lat: number; lng: number };
  user?: { lat: number; lng: number } | null;
  onSelect: (p: Pharmacy) => void;
};

export default function PharmacyMap({ pharmacies, center, user, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: false }).setView([center.lat, center.lng], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.setView([center.lat, center.lng]);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers();
    pharmacies.forEach((p) =>
      L.marker([p.lat, p.lng], { icon: icon(p.is_garde_active) })
        .on("click", () => onSelect(p))
        .addTo(layer.current!)
    );
    if (user) {
      L.circleMarker([user.lat, user.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(layer.current);
    }
  }, [pharmacies, user, onSelect]);

  return <div ref={el} className="h-full w-full" />;
}
