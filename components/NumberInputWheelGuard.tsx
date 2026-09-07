"use client";

import { useEffect } from "react";

/**
 * Evita que los <input type="number"> cambien de valor cuando el usuario
 * hace scroll con la rueda del mouse mientras el input tiene el foco.
 *
 * Se monta una sola vez en el layout raíz y cubre todos los inputs
 * numéricos de la app, presentes y futuros.
 */
export function NumberInputWheelGuard() {
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target instanceof HTMLInputElement &&
        target.type === "number" &&
        document.activeElement === target
      ) {
        event.preventDefault();
      }
    };

    // passive: false es necesario para poder llamar a preventDefault().
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
}
