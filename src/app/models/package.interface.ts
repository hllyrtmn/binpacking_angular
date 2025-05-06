import { BaseModel } from "./base-model.interface";
import { Order } from "./order.interface";
import { Pallet } from "./pallet.interface";

export interface Package extends BaseModel {
  order: Order;
  pallet?: Pallet | null;
  name?:string | null;
}
