"use client";

import { AlertTriangle, Info, Trash2, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    danger: {
      icon: Trash2,
      iconClass: "text-danger bg-danger/10",
      btnClass: "btn-destructive bg-danger text-white hover:bg-danger/90 border-none",
      ringClass: "ring-danger/20",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "text-warning bg-warning/10",
      btnClass: "btn-primary bg-warning hover:bg-warning/90 border-none",
      ringClass: "ring-warning/20",
    },
    info: {
      icon: Info,
      iconClass: "text-accent bg-accent/10",
      btnClass: "btn-primary bg-accent hover:bg-accent/90 border-none",
      ringClass: "ring-accent/20",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm overflow-visible">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.iconClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 mb-8">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary flex-1 h-11"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`${config.btnClass} flex-1 h-11 shadow-lg shadow-black/5 active:scale-95 transition-all`}
            >
              {isLoading ? (
                <div className="spinner h-4 w-4 border-white" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
