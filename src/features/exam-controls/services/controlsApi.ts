import type { ExamControls } from "@/lib/exam-controls";

export interface ControlsResponse {
  controls: ExamControls;
  updatedAt?: string;
  setupRequired?: boolean;
}

export async function fetchControls(): Promise<ControlsResponse> {
  const res = await fetch("/api/admin/controls");
  if (!res.ok) throw new Error("Failed to fetch controls");
  return res.json();
}

export async function saveControls(controls: ExamControls): Promise<ControlsResponse> {
  const res = await fetch("/api/admin/controls", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ controls }),
  });
  if (!res.ok) throw new Error("Failed to save controls");
  return res.json();
}