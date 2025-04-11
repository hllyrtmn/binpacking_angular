import { BaseModel } from "./base-model.interface";

export interface Order extends BaseModel {
  date: string; // ISO 8601 tarih formatı: "2025-04-11T14:30:00"
}
