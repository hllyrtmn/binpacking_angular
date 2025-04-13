import { Company } from "./company.interface";
import { ZeroModel } from "./zero-model.interface";

export interface BaseModel  extends ZeroModel{
  company?: Company; //Company
}
