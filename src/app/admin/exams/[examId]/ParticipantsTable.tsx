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
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium tracking-tight">
            Participants <span className="text-muted-foreground ml-1 font-normal">{participants.length}</span>
          </h3>
        </div>

        <div className="relative group max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-10 pr-4 bg-transparent border border-border rounded-md text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
        <table className="w-full text-sm text-left sticky-table">
          <thead className="bg-card border-b border-border sticky top-0 z-10">
            <tr>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">Student Info</th>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">College ID</th>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">Status</th>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs text-center">Security</th>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">Joined At</th>
              <th className="p-4 font-medium text-muted-foreground uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredParticipants.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {p.profiles?.full_name || "—"}
                    </span>
                    <span className="text-[13px] text-muted-foreground font-mono mt-0.5">
                      {p.profiles?.email}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-mono text-xs text-muted-foreground tracking-tighter">
                    {p.profiles?.student_college_id || "—"}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                      p.status === "waiting" ? "bg-warning/10 border-warning/20 text-warning" :
                      p.status === "active" ? "bg-primary/10 border-primary/20 text-primary" :
                      p.status === "submitted" ? "bg-success/10 border-success/20 text-success" :
                      p.status === "kicked" ? "bg-danger/10 border-danger/20 text-danger" :
                      "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {p.tab_switch_count && p.tab_switch_count > 0 ? (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded font-bold text-[10px] ${
                      p.tab_switch_count > 5 ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                    }`}>
                      <AlertTriangle className="w-3 h-3" />
                      <span>{p.tab_switch_count} Switches</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/80 font-mono italic">Secure</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(p.joined_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {actionLoading === p.user_id ? (
                      <div className="spinner h-4 w-4" />
                    ) : (
                      <>
                        {p.status !== "submitted" && p.status !== "kicked" && (
                          <button
                            onClick={() => onKick(p.user_id, p.profiles?.full_name || "Student")}
                            className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                            title="Kick Participant"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onReset(p.user_id, p.profiles?.full_name || "Student")}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Reset Attempt"
                        >
                          <RotateCcw className="w-4 h-4" />
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
