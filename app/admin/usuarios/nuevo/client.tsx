"use client";

import { useState } from "react";
import { SingleUserForm } from "./_components/single-user-form";
import { CsvBulkImport } from "./_components/csv-bulk-import";
import { UserPlus, Users } from "lucide-react";
import { PageHeader } from "../../_components/ui";

type Mode = "single" | "bulk";

export function NuevoUsuarioClient() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Usuarios"
        title="Crear usuarios"
        description="Creá usuarios uno por uno o por CSV y mandales el acceso por magic link."
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

      {mode === "single" ? <SingleUserForm /> : <CsvBulkImport />}
    </div>
  );
}
