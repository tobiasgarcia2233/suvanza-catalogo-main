"use client";

import type { EventOption } from "@/lib/eventQueries";

/**
 * Sales-context filter for the admin dashboards: every order, "Individual"
 * (outside events), or one event. Value: "" | "individual" | event id.
 */
export function EventFilterSelect({
  events,
  value,
  onChange,
  className = "",
}: {
  events: EventOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const open = events.filter((e) => e.status === "active");
  const closed = events.filter((e) => e.status !== "active");
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrar por evento"
      className={className}
    >
      <option value="">Todos los eventos</option>
      <option value="individual">Venta individual</option>
      {open.length > 0 && (
        <optgroup label="Abiertos">
          {open.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      )}
      {closed.length > 0 && (
        <optgroup label="Cerrados">
          {closed.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
