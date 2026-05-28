"use client";

import { useState } from "react";
import { SingleUserForm } from "./_components/single-user-form";
import { CsvBulkImport } from "./_components/csv-bulk-import";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import Link from "next/link";

type Mode = "single" | "bulk";

export function NuevoUsuarioClient() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel Admin
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Crear usuarios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Creá usuarios manualmente y enviá el acceso por magic link.
        </p>
      </div>

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
