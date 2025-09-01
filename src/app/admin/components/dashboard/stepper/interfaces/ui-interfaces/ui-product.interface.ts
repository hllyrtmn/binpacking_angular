import { Product } from "../../../../../../models/product.interface";

export interface IUiProduct extends Product {
  count: number;
  priority:number;

  split(perItem?: number | null): IUiProduct[];
}
