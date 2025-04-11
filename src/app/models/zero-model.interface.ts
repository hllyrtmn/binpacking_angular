import { User } from "../auth/models/user.model";

export interface ZeroModel {
  id: string; //UUID
  created_at: Date;
  updated_at: Date;
  created_by?: User | null; //UUID user
  updated_by?: User | null; //UUID user
  deleted_time: Date | null; //DateTime
  is_deleted: boolean; //boolean
}
