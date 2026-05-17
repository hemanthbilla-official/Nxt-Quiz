"use client";

import { Search } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ alignItems: "flex-start", paddingTop: "15vh" }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search exams, questions, or students..."
            className="flex-1 h-8 bg-transparent border-none outline-none text-sm text-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <kbd className="kbd">ESC</kbd>
        </div>
        <div className="p-6 text-center py-16">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Search results will appear here</p>
          <p className="text-xs text-muted-foreground mt-1">Start typing to search across the platform</p>
        </div>
        <div className="px-4 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <div className="flex gap-4">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
          </div>
          <span>Current workspace</span>
        </div>
      </div>
    </div>
  );
}