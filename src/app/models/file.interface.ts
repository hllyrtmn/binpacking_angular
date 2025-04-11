import { BaseModel } from "./base-model.interface";
import { Order } from "./order.interface";

export interface File extends BaseModel {
  order?: Order | null;
  file: string; // Genellikle bu alan backend'den gelen dosya URL'si olur
}
