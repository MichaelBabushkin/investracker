"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, CheckCircle, HelpCircle } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "success" | "info";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: React.ReactNode;
    iconBg: string;
    confirmBtn: string;
  }
> = {
  danger: {
    icon: <Trash2 size={22} className="text-rose-400" />,
    iconBg: "bg-rose-400/10",
    confirmBtn:
      "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
  },
  warning: {
    icon: <AlertTriangle size={22} className="text-amber-400" />,
    iconBg: "bg-amber-400/10",
    confirmBtn:
      "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20",
  },
  success: {
    icon: <CheckCircle size={22} className="text-brand-400" />,
    iconBg: "bg-brand-400/10",
    confirmBtn:
      "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20",
  },
  info: {
    icon: <HelpCircle size={22} className="text-blue-400" />,
    iconBg: "bg-blue-400/10",
    confirmBtn:
      "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20",
  },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "warning",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-surface-dark-tertiary border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fade-in">
        {/* Icon + content */}
        <div className="flex gap-4">
          <div
            className={`w-11 h-11 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-heading font-semibold text-gray-100 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-gray-100 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${config.confirmBtn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage confirm dialog state.
 * Usage:
 *   const { confirm, ConfirmDialogElement } = useConfirmDialog();
 *   const confirmed = await confirm({ title: "Delete?", message: "..." });
 *   return <>{ConfirmDialogElement}</>
 */
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    resolve?: (value: boolean) => void;
  }>({ open: false, title: "", message: "" });

  const confirm = React.useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: ConfirmVariant;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({ ...opts, open: true, resolve });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const handleCancel = React.useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false }));
  }, [state]);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogElement };
}
