export interface Student {
  id: string;
  full_name: string;
  email: string;
  student_college_id: string;
  role: string;
  onboarded_at: string | null;
  created_at: string;
  exam_participants?: ParticipantInfo[];
}

export interface ParticipantInfo {
  status: string;
  exams: {
    title: string;
  };
}

export interface UpdateStudentRequest {
  userId: string;
  full_name?: string;
  student_college_id?: string;
}

export interface DeleteStudentRequest {
  userId: string;
}

export interface StudentsResponse {
  students: Student[];
}