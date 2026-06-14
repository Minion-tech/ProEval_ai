export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
}

export interface Project {
  id: string;
  title: string;
  description: string;
  studentId: string;
  status: 'pending' | 'phase1_complete' | 'phase2_active' | 'completed';
}
