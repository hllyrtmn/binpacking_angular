import { User } from '../../../../../../auth/models/user.model';
import { Company } from '../../../../../../models/company.interface';
import { Dimension } from '../../../../../../models/dimension.interface';
import { ProductType } from '../../../../../../models/product-type.interface';
import { WeightType } from '../../../../../../models/weight-type.interface';
import { IUiProduct } from '../../interfaces/ui-interfaces/ui-product.interface';

export class UiProduct implements IUiProduct {
  split(perItem: number | null): IUiProduct {
    throw new Error('Method not implemented.');
  }
  name: string;
  count: number;
  product_type: ProductType;
  dimension: Dimension;
  weight_type: WeightType;
  company?: Company | undefined;
  id: string;
  created_at: Date;
  updated_at: Date;
  created_by?: User | null | undefined;
  updated_by?: User | null | undefined;
  deleted_time: Date | null;
  is_deleted: boolean;

  constructor(init: Partial<IUiProduct>) {
    this.name  = init.name!;
    this.count = init.count!;
    this.id = init.id!;
    this.created_at = init.created_at!;
    this.updated_at = init.updated_at!;
    this.product_type = init.product_type!;
    this.dimension = init.dimension!;
    this.weight_type = init.weight_type!;
    this.company = init.company;
    this.created_by = init.created_by;
    this.updated_by = init.updated_by;
    this.deleted_time = init.deleted_time!;
    this.is_deleted = init.is_deleted!;
  }
}
