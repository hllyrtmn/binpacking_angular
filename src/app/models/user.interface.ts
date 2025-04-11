import { Company } from "./company.interface";

export interface User{
  password: string;
  last_login: Date | null;
  is_superuser: boolean;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: Date;
  id: string;
  company: Company;
  is_admin: boolean;
}
