import { User } from '../../../../../../auth/models/user.model';
import { Company } from '../../../../../../models/company.interface';
import { Dimension } from '../../../../../../models/dimension.interface';
import { IUiPallet } from '../../interfaces/ui-interfaces/ui-pallet.interface';

export class UiPallet implements IUiPallet {
  name: string;
  dimension: Dimension;
  weight: number;
  company?: Company | undefined;
  id: string;
  created_at: Date;
  updated_at: Date;
  created_by?: User | null | undefined;
  updated_by?: User | null | undefined;
  deleted_time: Date | null;
  is_deleted: boolean;

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
    this.created_at = init.created_at!;
    this.updated_at = init.updated_at!;
    this.company = init.company;
    this.created_by = init.created_by;
    this.updated_by = init.updated_by;
    this.deleted_time = init.deleted_time!;
    this.is_deleted = init.is_deleted!;
  }
}
