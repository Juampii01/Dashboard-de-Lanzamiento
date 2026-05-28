"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { ResultReport, type UserResult } from "./result-report";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedRow {
  email: string;
  full_name?: string;
  phone?: string;
  expires_at?: string;
  notes?: string;
  _rowIndex: number;
  _emailValid: boolean;
  _duplicateEmail: boolean;
}

type Phase = "drop" | "preview" | "importing" | "done";

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvBulkImport() {
  const [phase, setPhase] = useState<Phase>("drop");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<UserResult[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Block navigation during import
  useEffect(() => {
    if (phase !== "importing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ---------------------------------------------------------------------------
  // CSV parsing
  // ---------------------------------------------------------------------------

  function processFile(file: File) {
    setFileError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Solo se aceptan archivos .csv");
      return;
    }
    if (file.size > 1_048_576) {
      setFileError("El archivo no puede superar 1 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setFileError("El CSV debe tener al menos una fila de encabezado y una de datos.");
          return;
        }

        // Parse CSV respecting quoted fields
        function parseLine(line: string): string[] {
          const fields: string[] = [];
          let cur = "";
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
              else inQuote = !inQuote;
            } else if (ch === "," && !inQuote) {
              fields.push(cur.trim()); cur = "";
            } else {
              cur += ch;
            }
          }
          fields.push(cur.trim());
          return fields;
        }

        const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));

        if (!headers.includes("email")) {
          setFileError(
            'El CSV debe tener una columna "email". Headers detectados: ' +
              headers.join(", ")
          );
          return;
        }

        const emailIdx = headers.indexOf("email");
        const fieldOf = (row: string[], name: string) => {
          const idx = headers.indexOf(name);
          return idx >= 0 ? (row[idx] ?? "").trim() : "";
        };

        const emailsSeen = new Set<string>();
        const parsed: ParsedRow[] = lines.slice(1).map((line, i) => {
          const cols = parseLine(line);
          const email = (cols[emailIdx] ?? "").trim().toLowerCase();
          const emailValid = EMAIL_RE.test(email);
          const dup = emailsSeen.has(email);
          if (email) emailsSeen.add(email);
          return {
            email,
            full_name: fieldOf(cols, "full_name") || undefined,
            phone: fieldOf(cols, "phone") || undefined,
            expires_at: fieldOf(cols, "expires_at") || undefined,
            notes: fieldOf(cols, "notes") || undefined,
            _rowIndex: i + 2,
            _emailValid: emailValid,
            _duplicateEmail: dup,
          };
        });

        if (parsed.length === 0) {
          setFileError("El CSV no tiene filas de datos.");
          return;
        }
        if (parsed.length > 200) {
          setFileError(
            `El CSV tiene ${parsed.length} filas. El máximo permitido es 200.`
          );
          return;
        }

        setRows(parsed);
        setPhase("preview");
      } catch (err) {
        setFileError(
          `Error al parsear el CSV: ${err instanceof Error ? err.message : "error desconocido"}`
        );
      }
    };
    reader.readAsText(file, "utf-8");
  }

  // ---------------------------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------------------------

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  async function handleImport() {
    const validRows = rows.filter(
      (r) => r._emailValid && !r._duplicateEmail
    );

    setPhase("importing");
    setImportError(null);

    try {
      const payload = {
        users: validRows.map((r) => ({
          email: r.email!,
          full_name: r.full_name?.trim() || null,
          phone: r.phone?.trim() || null,
          expires_at: r.expires_at?.trim()
            ? new Date(`${r.expires_at.trim()}T23:59:59Z`).toISOString()
            : null,
          notes: r.notes?.trim() || null,
        })),
      };

      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error ?? "Error del servidor");
        setPhase("preview");
        return;
      }

      // Map API results back to UserResult[], adding full_name from original rows
      const mappedResults: UserResult[] = (data.results ?? []).map(
        (r: UserResult) => {
          const original = validRows.find((row) => row.email === r.email);
          return { ...r, full_name: original?.full_name ?? null };
        }
      );

      setResults(mappedResults);
      setPhase("done");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Error de red"
      );
      setPhase("preview");
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const invalidRows = rows.filter(
    (r) => !r._emailValid || r._duplicateEmail
  );
  const validCount = rows.length - invalidRows.length;

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------

  if (phase === "done") {
    return (
      <ResultReport
        results={results}
        onReset={() => {
          setPhase("drop");
          setRows([]);
          setResults([]);
          setImportError(null);
        }}
      />
    );
  }

  if (phase === "importing") {
    return (
      <div className="border rounded-xl p-12 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-medium">Creando usuarios...</p>
        <p className="text-sm text-muted-foreground">
          No cierres esta ventana hasta que termine.
        </p>
      </div>
    );
  }

  if (phase === "preview") {
    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="border rounded-xl p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {rows.length} fila{rows.length !== 1 ? "s" : ""} detectadas
              </span>
            </div>
            <button
              onClick={() => {
                setPhase("drop");
                setRows([]);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cambiar archivo
            </button>
          </div>

          {invalidRows.length > 0 && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                {invalidRows.length} fila{invalidRows.length !== 1 ? "s" : ""}{" "}
                con problemas serán omitidas.{" "}
                <span className="font-medium">
                  Se importarán {validCount} usuarios.
                </span>
              </p>
            </div>
          )}
        </div>

        {importError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}

        {/* Preview table */}
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Nombre</th>
                  <th className="text-left px-3 py-2 font-medium">Teléfono</th>
                  <th className="text-left px-3 py-2 font-medium">Vence</th>
                  <th className="text-center px-3 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 10).map((row) => {
                  const hasIssue = !row._emailValid || row._duplicateEmail;
                  const issueLabel = !row._emailValid
                    ? "Email inválido"
                    : "Email duplicado";

                  return (
                    <tr
                      key={row._rowIndex}
                      className={hasIssue ? "bg-red-50/60" : undefined}
                    >
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row._rowIndex}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {row.email || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.full_name || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.phone || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {row.expires_at || "30d"}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {hasIssue ? (
                          <span className="text-red-600 font-medium">
                            {issueLabel}
                          </span>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && (
            <p className="text-xs text-muted-foreground px-3 py-2 bg-muted/30">
              … y {rows.length - 10} fila{rows.length - 10 !== 1 ? "s" : ""}{" "}
              más (no mostradas)
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setPhase("drop");
              setRows([]);
            }}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={validCount === 0}
            onClick={handleImport}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Importar {validCount} usuario{validCount !== 1 ? "s" : ""} →
          </button>
        </div>
      </div>
    );
  }

  // Phase: "drop"
  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
        }`}
      >
        <Upload
          className={`w-10 h-10 ${
            isDragging ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <div className="text-center">
          <p className="font-medium">
            {isDragging ? "Soltá el archivo" : "Arrastrá tu CSV aquí"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            o hacé clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Solo .csv · Máx 1 MB · Máx 200 filas
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {fileError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{fileError}</p>
        </div>
      )}

      {/* Format reference */}
      <div className="border rounded-xl p-4 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Formato esperado del CSV:
        </p>
        <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
          {`email,full_name,phone,expires_at,notes
juan@ejemplo.com,Juan Pérez,+54911...,2026-06-30,Por WhatsApp
maria@ejemplo.com,Maria López,,,`}
        </pre>
        <p className="text-xs text-muted-foreground mt-2">
          Solo <code className="bg-muted px-1 rounded">email</code> es
          obligatorio. El resto es opcional.
        </p>
      </div>
    </div>
  );
}
