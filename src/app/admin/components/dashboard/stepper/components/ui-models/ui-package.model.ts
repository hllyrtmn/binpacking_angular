import { User } from "../../../../../../auth/models/user.model";
import { Company } from "../../../../../../models/company.interface";
import { Order } from "../../../../../../models/order.interface";
import { IUiPackage } from "../../interfaces/ui-interfaces/ui-package.interface";
import { IUiPallet } from "../../interfaces/ui-interfaces/ui-pallet.interface";
import { IUiProduct } from "../../interfaces/ui-interfaces/ui-product.interface";

export class UiPackage implements IUiPackage{
  pallet: IUiPallet | null;
  products: IUiProduct[];
  addProduct(product: IUiProduct): void {
    throw new Error("Method not implemented.");
  }
  removeProduct(product: IUiProduct): void {
    throw new Error("Method not implemented.");
  }
  addPallet(pallet: IUiPallet): void {
    throw new Error("Method not implemented.");
  }
  isValid(product: IUiPallet): boolean {
    throw new Error("Method not implemented.");
  }
  order: Order;
  company?: Company | undefined;
  id: string;
  created_at: Date;
  updated_at: Date;
  created_by?: User | null | undefined;
  updated_by?: User | null | undefined;
  deleted_time: Date | null;
  is_deleted: boolean;

  constructor(init: Partial<IUiPackage>) {
    this.pallet = init.pallet!;
    this.products = init.products!;
    this.order = init.order!;
    this.company = init.company;
    this.id = init.id!;
    this.created_at = init.created_at!;
    this.updated_at = init.updated_at!;
    this.created_by = init.created_by;
    this.updated_by = init.updated_by;
    this.deleted_time = init.deleted_time!;
    this.is_deleted = init.is_deleted!;
  }

}
