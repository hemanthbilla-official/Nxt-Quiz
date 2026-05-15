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
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
            Edit Exam Settings
          </h2>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="section-label">
                Exam Title
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) =>
                  onFormChange((prev) => ({ ...prev, title: e.target.value }))
                }
                className="input w-full"
                placeholder="e.g. Computer Science Final"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="section-label">
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
                  className="input w-full"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="section-label">
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
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1 h-11"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex-1 h-11"
              >
                {isSaving ? (
                  <>
                    <div className="spinner h-4 w-4" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

