export interface Pocket {
  id: number;
  medicine_name: string;
  strength: number;
  current_stock: number;
  unit: string;
}

export interface Patient {
  id: number;
  name: string;
  room: string;
  ln: string;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: string;
}

export interface LogEntry {
  id: number;
  pocket_id: number;
  medicine_name: string;
  strength: number;
  patient_id: number | null;
  patient_name: string | null;
  user_name: string;
  witness_name: string;
  amount: number;
  type: 'withdrawal' | 'restock';
  timestamp: string;
}
