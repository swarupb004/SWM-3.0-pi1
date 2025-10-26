export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  team?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: string;
  team?: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  check_in: string;
  check_out?: string;
  break_start?: string;
  break_end?: string;
  total_break_minutes: number;
  status: string;
  date: string;
  created_at: string;
  updated_at: string;
  username?: string;
  email?: string;
  team?: string;
}

export interface Case {
  id: number;
  case_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  case_type: string;
  priority: string;
  status: string;
  description?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface CaseHistory {
  id: number;
  case_id: number;
  user_id: number;
  username: string;
  action: string;
  notes?: string;
  created_at: string;
}

export interface CaseStats {
  total_cases: number;
  open_cases: number;
  in_progress_cases: number;
  resolved_cases: number;
  closed_cases: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}
