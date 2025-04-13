import { BaseModel } from "./base-model.interface";

export interface WeightType extends BaseModel {
  std: number;
  eco: number;
  pre: number;
}
