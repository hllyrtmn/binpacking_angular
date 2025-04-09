import { PageEvent } from "@angular/material/paginator";
import { Observable } from "rxjs";
import { ApiResponse } from "./api-response";

export interface ModelService<Model> {
    getAllModel(searchValue:string,pageEvent?:PageEvent): Observable<ApiResponse<Model>>;
    editModel(model:Model): Observable<any>;
    addModel(model:Model):Observable<any>;
    deleteModel(id:string): Observable<any>;
}
