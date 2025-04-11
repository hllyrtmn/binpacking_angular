import { BaseModel } from "./base-model.interface";
import { Dimension } from "./dimension.interface";

export interface Pallet extends BaseModel {
  dimension: Dimension;
  weight: number;
}
