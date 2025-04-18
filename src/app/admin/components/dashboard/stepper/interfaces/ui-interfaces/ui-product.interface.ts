import { Product } from "../../../../../../models/product.interface";

export interface IUiProduct extends Product {
  name: string;
  count: number;
  split(perItem: number | null): IUiProduct;
}
