import { Participant } from "./types";

interface ParticipantsTableProps {
  participants: Participant[];
  filteredParticipants: Participant[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionLoading: string | null;
  onKick: (userId: string, name: string) => void;
  onReset: (userId: string, name: string) => void;
}

export default function ParticipantsTable({
  participants,
  filteredParticipants,
  searchQuery,
  onSearchChange,
  actionLoading,
  onKick,
  onReset,
}: ParticipantsTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border gap-4">
        <h3 className="text-sm font-semibold text-foreground flex-shrink-0">
          Students ({participants.length})
        </h3>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/5">
              <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">
                Name
              </th>
              <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">
                College ID
              </th>
              <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">
                Status
              </th>
              <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap text-center">
                Tab Switches
              </th>
              <th className="text-left p-4 text-muted-foreground font-medium whitespace-nowrap">
                Joined At
              </th>
              <th className="text-right p-4 text-muted-foreground font-medium whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border/50 hover:bg-card-hover transition-colors"
              >
                <td className="p-4 text-foreground whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {p.profiles?.full_name || "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {p.profiles?.email}
                    </span>
                  </div>
                </td>
                <td className="p-4 font-mono text-accent whitespace-nowrap">
                  {p.profiles?.student_college_id || "—"}
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span
                    className={`text-[10px] px-2 py-1 rounded-lg uppercase tracking-wider font-bold ${
                      p.status === "waiting"
                        ? "bg-warning/10 text-warning"
                        : p.status === "active"
                          ? "bg-primary/10 text-primary"
                          : p.status === "submitted"
                            ? "bg-success/10 text-success"
                            : p.status === "kicked"
                              ? "bg-danger/10 text-danger"
                              : "bg-muted/10 text-muted"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {p.tab_switch_count && p.tab_switch_count > 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold text-xs ${
                        p.tab_switch_count > 5
                          ? "bg-danger/10 text-danger animate-pulse"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      {p.tab_switch_count}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      —
                    </span>
                  )}
                </td>
                <td className="p-4 text-muted-foreground text-[11px] whitespace-nowrap">
                  {new Date(p.joined_at).toLocaleString()}
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {actionLoading === p.user_id ? (
                      <div
                        className="spinner"
                        style={{ width: 14, height: 14 }}
                      />
                    ) : (
                      <>
                        {p.status !== "submitted" &&
                          p.status !== "kicked" && (
                            <button
                              onClick={() =>
                                onKick(
                                  p.user_id,
                                  p.profiles?.full_name || "Student",
                                )
                              }
                              className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-danger hover:bg-danger/10 transition-all"
                              title="Kick from exam"
                            >
                              Kick
                            </button>
                          )}
                        <button
                          onClick={() =>
                            onReset(
                              p.user_id,
                              p.profiles?.full_name || "Student",
                            )
                          }
                          className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/10 transition-all"
                          title="Reset attempt"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {participants.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    No students have joined yet
                  </p>
                </td>
              </tr>
            ) : filteredParticipants.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground text-sm"
                >
                  No students match your active filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
