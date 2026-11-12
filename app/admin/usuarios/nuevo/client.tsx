"use client";

import { useState } from "react";
import { SingleUserForm } from "./_components/single-user-form";
import { CsvBulkImport } from "./_components/csv-bulk-import";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "../../_components/ui";

type Mode = "single" | "bulk";

export function NuevoUsuarioClient({ initialFree = false }: { initialFree?: boolean }) {
  const [mode, setMode] = useState<Mode>("single");
  const [free, setFree] = useState(initialFree);

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Usuarios"
        title={free ? "Crear usuarios gratuitos" : "Crear usuarios"}
        description="Crea usuarios uno por uno o por CSV y mándales el acceso por magic link."
      />

      {/* Mode selector */}
      <div className="flex gap-2 mb-8 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setMode("single")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "single"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Un usuario
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "bulk"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Importar CSV
        </button>
      </div>

      {/* Tipo de acceso: pago o gratuito (alumno) */}
      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Tipo de acceso</p>
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
          {[
            { v: false, label: "Pago", hint: "Compite por puntos y premios" },
            { v: true, label: "Gratuito (alumno)", hint: "Usa el dashboard, sin puntos ni premios" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setFree(o.v)}
              title={o.hint}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                free === o.v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {free
            ? "Se crea como gratuito: usa todo el dashboard, pero no suma puntos ni compite por los premios."
            : "Se crea como participante pago: suma puntos y compite por los premios."}
        </p>
      </div>

      {mode === "single" ? <SingleUserForm isStudent={free} /> : <CsvBulkImport isStudent={free} />}
    </div>
  );
}
