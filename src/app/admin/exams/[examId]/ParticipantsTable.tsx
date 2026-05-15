import { Search, RotateCcw, UserMinus, AlertTriangle, Users } from "lucide-react";
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
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-card/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-base font-semibold tracking-tight">
            Participants <span className="text-muted-foreground ml-1.5 font-normal text-sm">{participants.length}</span>
          </h3>
        </div>

        <div className="relative group max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input w-full"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-background-secondary border-b border-border">
              <th className="table-header-cell">Student Info</th>
              <th className="table-header-cell">College ID</th>
              <th className="table-header-cell text-center">Status</th>
              <th className="table-header-cell text-center">Security</th>
              <th className="table-header-cell">Joined At</th>
              <th className="table-header-cell text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredParticipants.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-accent/[0.02] transition-colors group"
              >
                <td className="table-cell">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                      {p.profiles?.full_name || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono mt-0.5">
                      {p.profiles?.email}
                    </span>
                  </div>
                </td>
                <td className="table-cell">
                  <span className="font-mono text-xs text-muted-foreground tracking-tighter">
                    {p.profiles?.student_college_id || "—"}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <span
                    className={`badge ${
                      p.status === "waiting" ? "badge-warning" :
                      p.status === "active" ? "badge-accent" :
                      p.status === "submitted" ? "badge-success" :
                      p.status === "kicked" ? "badge-danger" :
                      "badge-default"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="table-cell text-center">
                  {p.tab_switch_count && p.tab_switch_count > 0 ? (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-bold text-[10px] ${
                      p.tab_switch_count > 5 ? "bg-danger/10 text-danger border border-danger/20" : "bg-warning/10 text-warning border border-warning/20"
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      <span>{p.tab_switch_count} Switches</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/60 font-mono tracking-wider uppercase">Secure</span>
                  )}
                </td>
                <td className="table-cell">
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td className="table-cell text-center">
                  <div className="flex items-center justify-center gap-1">
                    {actionLoading === p.user_id ? (
                      <div className="spinner h-4 w-4" />
                    ) : (
                      <>
                        {p.status !== "submitted" && p.status !== "kicked" && (
                          <button
                            onClick={() => onKick(p.user_id, p.profiles?.full_name || "Student")}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-danger hover:bg-danger/5 rounded-md transition-colors"
                            title="Kick Participant"
                          >
                            <UserMinus className="w-4 h-4" />
                            <span>Kick</span>
                          </button>
                        )}
                        <button
                          onClick={() => onReset(p.user_id, p.profiles?.full_name || "Student")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-accent hover:bg-accent/5 rounded-md transition-colors"
                          title="Reset Attempt"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset</span>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {participants.length === 0 && (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mt-4">Waiting for participants</p>
                  <p className="text-sm text-muted-foreground mt-1">Share the exam code to let students join the session.</p>
                </td>
              </tr>
            )}

            {participants.length > 0 && filteredParticipants.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <p className="text-xs text-muted-foreground italic">No participants match your current search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
