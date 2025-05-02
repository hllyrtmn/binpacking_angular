import { Product } from "../../../../../../models/product.interface";

export interface IUiProduct extends Product {
  count: number;

  split(perItem?: number | null): IUiProduct[];
}
