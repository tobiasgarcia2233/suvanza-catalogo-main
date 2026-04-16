"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ImageUpload({
  value,
  onChange,
  folder,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError(
        "Faltan envs: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", UPLOAD_PRESET);
        if (folder) fd.append("folder", folder);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: "POST", body: fd },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Cloudinary falló: ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        uploaded.push(data.secure_url as string);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setBusy(false);
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const copy = [...value];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    onChange(copy);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-semibold hover:bg-gray-800">
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {busy ? "Subiendo..." : "Subir imágenes"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative group border border-gray-200 rounded-md overflow-hidden w-24 h-24"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  className="bg-white/90 rounded px-1 text-xs"
                  disabled={i === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  className="bg-white/90 rounded px-1 text-xs"
                  disabled={i === value.length - 1}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
