"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";

export default function WaitingRoom({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [examTitle, setExamTitle] = useState("");
  const [participantCount, setParticipantCount] = useState(0);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const router = useRouter();

  const fetchExamData = useCallback(async () => {
    const res = await fetch(`/api/exam/${examId}/status`);
    if (res.ok) {
      const data = await res.json();
      setExamTitle(data.title || "");
      setCapacity(data.capacity);
      setDurationMinutes(data.durationSeconds ? Math.round(data.durationSeconds / 60) : null);
      setParticipantCount(data.participantCount || 0);

      if (data.status === "in_progress") {
        router.push(`/exam/${examId}/take`);
        return;
      }
      if (data.status === "closed") {
        router.push(`/exam/${examId}/submitted`);
        return;
      }
    }
  }, [examId, router]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user && process.env.NEXT_PUBLIC_ENVIRONMENT !== "local") {
        router.push("/login");
      }
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchExamData();

    const channel = supabase
      .channel(`exam-realtime-${examId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "exams",
          filter: `id=eq.${examId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === "in_progress") {
            router.push(`/exam/${examId}/take`);
          } else if (newStatus === "closed") {
            router.push(`/exam/${examId}/submitted`);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exam_participants",
          filter: `exam_id=eq.${examId}`,
        },
        () => {
          fetchExamData();
        }
      )
      .subscribe();

    const interval = setInterval(fetchExamData, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [examId, router, fetchExamData]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <FloatingThemeToggle />
      <div className="w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Waiting Room</h1>
        {examTitle && (
          <p className="text-base text-primary font-medium mb-8">{examTitle}</p>
        )}

        <div className="card p-8 mb-6">
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{participantCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Students Joined</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">{capacity !== null ? capacity : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Capacity</p>
            </div>
          </div>

          <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-primary rounded-full transition-all duration-200"
              style={{ width: `${Math.min((participantCount / (capacity || 1)) * 100, 100)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
            <span className="text-sm">Waiting for the instructor to start the exam</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full dot-1" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full dot-2" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full dot-3" />
            </span>
          </div>
        </div>

        <div className="card p-6 text-left">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Before the exam starts:
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Ensure a stable internet connection
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {durationMinutes !== null ? `You have ${durationMinutes} minutes once the exam begins` : "You have a limited time once the exam begins"}
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              You can bookmark, skip, and revisit questions
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Answers auto-save as you go
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
