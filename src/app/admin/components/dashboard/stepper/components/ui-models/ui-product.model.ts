import { User } from '../../../../../../auth/models/user.model';
import { Company } from '../../../../../../models/company.interface';
import { Dimension } from '../../../../../../models/dimension.interface';
import { ProductType } from '../../../../../../models/product-type.interface';
import { WeightType } from '../../../../../../models/weight-type.interface';
import { IUiProduct } from '../../interfaces/ui-interfaces/ui-product.interface';

export class UiProduct implements IUiProduct {

  split(perItem?: number | null): UiProduct[] {
    if (this.count <= 1) {
      return [this];
    }
    const itemCount = perItem === undefined ? null : perItem;
    const firstCount = itemCount !== null ? itemCount : Math.ceil(this.count / 2);
    const secondCount = this.count - firstCount;

    if (firstCount <= 0 || secondCount <= 0) {
      return [this];
    }

    // this additional id part to use in draggable component [id] attribute
    // if both products has same id then draggable component is not unique
    // and it will not work properly
    const firstProduct = new UiProduct({
      ...this,
      count: firstCount,
      id: this.id + '/1',
    });

    const secondProduct = new UiProduct({
      ...this,
      count: secondCount,
      id: this.id + '/2',
    });
    return [firstProduct, secondProduct];
  }

  name: string;
  count: number;
  product_type: ProductType;
  dimension: Dimension;
  weight_type: WeightType;
  company?: Company | undefined;
  id: string;

  constructor(init: Partial<IUiProduct>) {
    this.name =
      init.dimension?.depth != null && init.dimension?.width != null
        ? `${Math.trunc(init.dimension.depth)} X ${Math.trunc(
          init.dimension.width
        )}`
        : 'Unnamed Product';
    this.count = init.count!;
    this.id = init.id!;
    this.product_type = init.product_type!;
    this.dimension = init.dimension!;
    this.weight_type = init.weight_type!;
    this.company = init.company;
  }
}
