"use client";

import { CheckCircle2, XCircle, Download, RotateCcw } from "lucide-react";

export type UserResult = {
  email: string;
  full_name?: string | null;
  status: "ok" | "error";
  error?: string;
  user_id?: string;
};

interface ResultReportProps {
  results: UserResult[];
  onReset: () => void;
}

export function ResultReport({ results, onReset }: ResultReportProps) {
  const okCount = results.filter((r) => r.status === "ok").length;
  const errCount = results.filter((r) => r.status === "error").length;

  function downloadCsv() {
    const header = "email,full_name,status,error,user_id";
    const rows = results.map(
      (r) =>
        [
          `"${r.email}"`,
          `"${r.full_name ?? ""}"`,
          r.status,
          `"${r.error ?? ""}"`,
          r.user_id ?? "",
        ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `govbidder_import_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-green-50 border-green-200 text-center">
          <p className="text-3xl font-bold text-green-700">{okCount}</p>
          <p className="text-sm text-green-600 mt-1">Creados exitosamente</p>
        </div>
        <div
          className={`border rounded-xl p-4 text-center ${
            errCount > 0
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p
            className={`text-3xl font-bold ${
              errCount > 0 ? "text-red-700" : "text-gray-400"
            }`}
          >
            {errCount}
          </p>
          <p
            className={`text-sm mt-1 ${
              errCount > 0 ? "text-red-600" : "text-gray-400"
            }`}
          >
            Con errores
          </p>
        </div>
      </div>

      {/* Detail table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Nombre</th>
                <th className="text-center px-4 py-2 font-medium">Estado</th>
                <th className="text-left px-4 py-2 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((r, i) => (
                <tr
                  key={i}
                  className={
                    r.status === "error" ? "bg-red-50/60" : undefined
                  }
                >
                  <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {r.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.status === "ok"
                      ? `ID: ${r.user_id?.slice(0, 8)}…`
                      : r.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={downloadCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Descargar reporte CSV
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Crear más usuarios
        </button>
      </div>
    </div>
  );
}
