"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const BUTTON_VARIANTS = {
  primary: "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        BUTTON_VARIANTS[variant],
        className,
      )}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500",
        className,
      )}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
    />
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    />
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
      {message}
    </p>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** Modal built on <dialog> so focus trapping and Esc come from the platform. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className={cn(
        "w-full rounded-lg border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/40",
        wide ? "max-w-3xl" : "max-w-xl",
      )}
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
