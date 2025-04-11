import { BaseModel } from "./base-model.interface";
import { Package } from "./package.interface";
import { Product } from "./product.interface";

export interface PackageDetail extends BaseModel {
  package: Package;
  product: Product;
  count: number;
}
