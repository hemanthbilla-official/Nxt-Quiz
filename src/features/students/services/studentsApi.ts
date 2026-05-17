import type { Student } from "@/types";

export interface StudentsResponse {
  students: Student[];
}

export async function fetchStudents(): Promise<Student[]> {
  const res = await fetch("/api/admin/students");
  if (res.ok) {
    const data = await res.json();
    return data.students || [];
  }
  throw new Error("Failed to fetch students");
}

export async function updateStudent(userId: string, updates: { full_name?: string; student_college_id?: string }): Promise<void> {
  const res = await fetch("/api/admin/students", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...updates }),
  });
  if (!res.ok) throw new Error("Failed to update student");
}

export async function deleteStudent(userId: string): Promise<void> {
  const res = await fetch("/api/admin/students", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error("Failed to delete student");
}