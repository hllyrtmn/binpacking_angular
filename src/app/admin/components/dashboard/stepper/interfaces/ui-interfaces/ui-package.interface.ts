import { Package } from "../../../../../../models/package.interface";
import { IUiPallet } from "./ui-pallet.interface";
import { IUiProduct } from "./ui-product.interface";

export interface IUiPackage extends Package {
  pallet: IUiPallet | null;
  products: IUiProduct[];
  totalMeter:number;
  totalWeight:number;
  totalVolume:number
  // addProduct(product: IUiProduct): void;
  // removeProduct(product: IUiProduct): void;
  // addPallet(pallet: IUiPallet): void;
  // isValid(product: IUiPallet): boolean;
}
