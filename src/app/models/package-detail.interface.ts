import { BaseModel } from "./base-model.interface";
import { Package } from "./package.interface";
import { Product } from "./product.interface";

export interface PackageDetail extends BaseModel {
  // Ya package nesnesi ya da package_id olabilir
  package?: Package;
  package_id?: string;

  // Ya product nesnesi ya da product_id olabilir
  product?: Product;
  product_id?: string;

  count: number;
  priority:number;
}
