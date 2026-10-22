"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "h-[50px] w-full rounded-xl border border-[rgba(13,26,61,0.14)] bg-[#F7F8FA] px-3.5 text-[15px] text-[#0d1a3d] " +
  "placeholder:text-[#9AA7BA] outline-none transition-all hover:border-[rgba(13,26,61,0.24)] " +
  "focus:border-[#152978] focus:bg-white focus:ring-4 focus:ring-[#152978]/10 disabled:opacity-60";

export function Field({
  label,
  hint,
  icon: Icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode; icon?: LucideIcon }) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-[#0d1a3d]">{label}</label>
      <div className="group relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9AA7BA] transition-colors group-focus-within:text-[#152978]" />
        )}
        <input id={id} className={cn(inputCls, Icon && "pl-11")} {...props} />
      </div>
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
      <div className="group relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9AA7BA] transition-colors group-focus-within:text-[#152978]" />
        <input id={id} type={show ? "text" : "password"} className={cn(inputCls, "pl-11 pr-11")} {...props} />
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
      className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#E42D2C] px-4 text-[15.5px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(228,45,44,0.8),inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:bg-[#cf2423] hover:shadow-[0_14px_28px_-10px_rgba(228,45,44,0.85)] active:translate-y-px disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
      {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
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
