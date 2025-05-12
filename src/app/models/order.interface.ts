import { CompanyRelation } from "./company-relation.interface";
import { ZeroModel } from "./zero-model.interface";

export interface Order extends ZeroModel {
  date: string; // ISO 8601 tarih formatı: "2025-04-11T14:30:00"
  name: string;
  weigth_type:string;
  company_relation: CompanyRelation
}
