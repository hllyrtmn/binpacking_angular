import { BaseModel } from "./base-model.interface";

export interface Dimension extends BaseModel {
  width: number;
  height: number;
  depth: number;
  unit: string;
  dimension_type: string;
  volume: number;
}
