import { Company } from '../../../../../models/company.interface';
import { Dimension } from '../../../../../models/dimension.interface';
import { IUiPallet } from '../../interfaces/ui-interfaces/ui-pallet.interface';

export class UiPallet implements IUiPallet {
  name: string;
  dimension: Dimension;
  weight: number;
  company?: Company | undefined;
  id: string;
  constructor(init: Partial<IUiPallet>) {
    this.name =
      init.dimension?.depth != null && init.dimension?.width != null
        ? `${Math.trunc(init.dimension.depth)} X ${Math.trunc(
            init.dimension.width
          )}`
        : 'Unnamed Pallet';
    this.dimension = init.dimension!;
    this.weight = init.weight!;
    this.id = init.id!;
    this.company = init.company;
  }
}
