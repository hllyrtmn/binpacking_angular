import { BaseModel } from "./base-model.interface";

export interface ProductType extends BaseModel {
  code: string;
  type: string;
}
