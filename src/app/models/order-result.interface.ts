import { BaseModel } from "./base-model.interface";
import { Order } from "./order.interface";

export interface OrderResult extends BaseModel {
  order: Order;
  result: string;
  success: boolean;
  progress: number; // 0-100 arası
}
