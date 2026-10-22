"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-[rgba(13,26,61,0.16)] bg-white px-3.5 py-3 text-[15px] text-[#0d1a3d] " +
  "placeholder:text-[#94a3b8] outline-none transition-colors focus:border-[#152978] focus:ring-4 focus:ring-[#152978]/10 " +
  "disabled:opacity-60";

export function Field({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-[#0d1a3d]">{label}</label>
      <input id={id} className={inputCls} {...props} />
      {hint && <p className="text-xs text-[#5A6B85]">{hint}</p>}
    </div>
  );
}

export function PasswordField({
  label = "Contraseña",
  hint,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: string; hint?: React.ReactNode }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-semibold text-[#0d1a3d]">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className={cn(inputCls, "pr-11")} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg text-[#5A6B85] hover:bg-[#EEF1F6]"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-[#5A6B85]">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E42D2C] px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(228,45,44,0.7)] transition-colors hover:bg-[#c92221] disabled:opacity-60"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-[#E42D2C]/25 bg-[#E42D2C]/[0.06] px-3.5 py-3 text-sm text-[#a51b1a]">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "gold" | "success"; children: React.ReactNode }) {
  const cls =
    tone === "gold"
      ? "border-[#FFD700]/60 bg-[#FFD700]/[0.12] text-[#5c4700]"
      : tone === "success"
        ? "border-[#16A65F]/30 bg-[#16A65F]/[0.07] text-[#0f6b3e]"
        : "border-[#152978]/15 bg-[#152978]/[0.05] text-[#152978]";
  return <div className={cn("rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed", cls)}>{children}</div>;
}
