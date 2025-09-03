import { Order } from "../../../../models/order.interface";

export interface FileResponse {
  id: string;
  file: string;
  order: Order;
}
