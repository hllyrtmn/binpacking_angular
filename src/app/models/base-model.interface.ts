import { Company } from "./company.interface";

export interface BaseModel{
  id: string; //UUID
  company?: Company; //Company
}
