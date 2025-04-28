import { User } from "../../../../../../auth/models/user.model";
import { Company } from "../../../../../../models/company.interface";
import { Order } from "../../../../../../models/order.interface";
import { IUiPackage } from "../../interfaces/ui-interfaces/ui-package.interface";
import { IUiPallet } from "../../interfaces/ui-interfaces/ui-pallet.interface";
import { IUiProduct } from "../../interfaces/ui-interfaces/ui-product.interface";

export class UiPackage implements IUiPackage{
  pallet: IUiPallet | null;
  products: IUiProduct[];
  // addProduct(product: IUiProduct): void {
  //   throw new Error("Method not implemented.");
  // }
  // removeProduct(product: IUiProduct): void {
  //   throw new Error("Method not implemented.");
  // }
  // addPallet(pallet: IUiPallet): void {
  //   throw new Error("Method not implemented.");
  // }
  // isValid(product: IUiPallet): boolean {
  //   throw new Error("Method not implemented.");
  // }
  order: Order;
  company?: Company | undefined;
  id: string;

  get totalMeter(): number {
    return this.products?.reduce((sum, product) => {
      return sum + (Math.floor(product.count * Math.floor(product.dimension.depth)) / 1000);
    }, 0) ?? 0;
  }

  get totalVolume(): number {
    return this.products?.reduce((sum, product) => {
      return sum + (Math.floor(product.count * product.dimension.volume) / 1000);
    }, 0) ?? 0;
  }

  get totalWeight(): number {
    return this.products?.reduce((sum, product) => {
      return sum + Math.floor(product.count * product.weight_type.std);
    }, 0) ?? 0;
  }

  constructor(init: Partial<IUiPackage>) {
    this.pallet = init.pallet!;
    this.products = init.products!;
    this.order = init.order!;
    this.company = init.company;
    this.id = init.id!;
  }

}
