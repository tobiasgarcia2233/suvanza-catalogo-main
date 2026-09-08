"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import type { Category } from "@/types";

function sortByName(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export default function CategoryManager({
  categories,
  onChange,
  onCategoryRenamed,
  onCategoryDeleted,
}: {
  categories: Category[];
  onChange: (next: Category[]) => void;
  /** Called when a category is renamed, so the form can follow the selection. */
  onCategoryRenamed?: (prevName: string, nextName: string) => void;
  /** Called when a category is deleted, so the form can clear the selection. */
  onCategoryDeleted?: (name: string) => void;
}) {
  const router = useRouter();
  const { openConfirmationModal } = useUIStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(c: Category) {
    setError(null);
    setEditingId(c.id);
    setDraft(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setError(null);
  }

  async function saveEdit(c: Category) {
    const next = draft.trim();
    if (!next || next === c.name) {
      cancelEdit();
      return;
    }
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(c.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "No se pudo renombrar.");
      const renamed: Category = data.category;
      onChange(
        sortByName(categories.map((x) => (x.id === c.id ? renamed : x))),
      );
      onCategoryRenamed?.(c.name, renamed.name);
      cancelEdit();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusyId(null);
    }
  }

  async function doDelete(c: Category) {
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${encodeURIComponent(c.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar la categoría.");
      onChange(categories.filter((x) => x.id !== c.id));
      onCategoryDeleted?.(c.name);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusyId(null);
    }
  }

  function confirmDelete(c: Category) {
    openConfirmationModal({
      title: `Eliminar “${c.name}”`,
      message: (
        <div className="flex flex-col gap-2">
          <p>
            Vas a eliminar la categoría <strong>{c.name}</strong>. Esta acción no
            se puede deshacer.
          </p>
          <p>
            Los productos que tengan esta categoría van a quedar{" "}
            <strong>sin categoría</strong>. No se elimina ningún producto, pero
            desaparecerá del filtro del catálogo.
          </p>
        </div>
      ),
      onConfirm: () => {
        void doDelete(c);
      },
    });
  }

  if (categories.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        Todavía no hay categorías. Escribí una nueva arriba y se crea al guardar
        el producto.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-gray-500">Categorías existentes</span>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const isEditing = editingId === c.id;
          const busy = busyId === c.id;
          return (
            <div
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm"
            >
              {isEditing ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveEdit(c);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    disabled={busy}
                    className="w-28 border-b border-gray-400 bg-transparent text-gray-800 outline-none disabled:opacity-50"
                    aria-label={`Nuevo nombre para ${c.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => void saveEdit(c)}
                    disabled={busy}
                    className="rounded-full p-1 text-green-600 hover:bg-green-100 disabled:opacity-50"
                    aria-label="Aceptar nuevo nombre"
                  >
                    {busy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={busy}
                    className="rounded-full p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                    aria-label="Cancelar"
                  >
                    <X size={13} />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-700">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    disabled={busy}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
                    aria-label={`Editar ${c.name}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(c)}
                    disabled={busy}
                    className="rounded-full p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Eliminar ${c.name}`}
                  >
                    {busy ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
