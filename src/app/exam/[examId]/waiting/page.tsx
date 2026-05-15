"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "react-toastify";

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
    } else if (res.status === 404) {
      toast.error("This exam is no longer available.");
      router.push("/exam/join");
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
          event: "DELETE",
          schema: "public",
          table: "exams",
          filter: `id=eq.${examId}`,
        },
        () => {
          toast.error("This exam is no longer available.");
          router.push("/exam/join");
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

  const progress = capacity ? Math.min((participantCount / capacity) * 100, 100) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <FloatingThemeToggle />
      <div className="w-full max-w-md text-center animate-fade-in">
        <h1 className="text-xl font-bold tracking-tight mb-1">Waiting Room</h1>
        {examTitle && (
          <p className="text-sm text-accent font-medium mb-6">{examTitle}</p>
        )}

        <div className="card p-6 mb-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{participantCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Joined</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground tabular-nums">{capacity !== null ? capacity : "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Capacity</p>
            </div>
          </div>

          {/* Progress */}
          <div className="progress-track h-2 mb-6">
            <div
              className="progress-fill bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status message */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="text-sm">Waiting for instructor</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full dot-1" />
              <span className="w-1.5 h-1.5 bg-accent rounded-full dot-2" />
              <span className="w-1.5 h-1.5 bg-accent rounded-full dot-3" />
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="card p-5 text-left">
          <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
            Before the exam starts
          </h3>
          <ul className="space-y-2.5">
            {[
              "Ensure a stable internet connection",
              durationMinutes !== null
                ? `You have ${durationMinutes} minutes once the exam begins`
                : "You have a limited time once the exam begins",
              "You can bookmark, skip, and revisit questions",
              "Answers auto-save as you go",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
