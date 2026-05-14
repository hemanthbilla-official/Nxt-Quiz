interface EditExamModalProps {
  editForm: {
    title: string;
    capacity: number | string;
    durationMinutes: number | string;
  };
  isSaving: boolean;
  onFormChange: (
    updater: (prev: {
      title: string;
      capacity: number | string;
      durationMinutes: number | string;
    }) => { title: string; capacity: number | string; durationMinutes: number | string },
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function EditExamModal({
  editForm,
  isSaving,
  onFormChange,
  onSubmit,
  onClose,
}: EditExamModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="card p-6 sm:p-8 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-6">
          Edit Exam Settings
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Title
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                onFormChange((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                value={editForm.durationMinutes}
                onChange={(e) =>
                  onFormChange((prev) => ({
                    ...prev,
                    durationMinutes:
                      e.target.value === "" ? "" : parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Capacity
              </label>
              <input
                type="number"
                value={editForm.capacity}
                onChange={(e) =>
                  onFormChange((prev) => ({
                    ...prev,
                    capacity:
                      e.target.value === "" ? "" : parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded text-sm font-medium bg-card border border-border text-foreground hover:bg-card-hover transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover transition-all disabled:bg-muted disabled:text-muted-foreground flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div
                    className="spinner"
                    style={{
                      width: 14,
                      height: 14,
                      borderTopColor: "white",
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
