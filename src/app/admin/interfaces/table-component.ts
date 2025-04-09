export interface TableComponent<Model> {
    search(searchValue:string):void;
    openModelDialog(model:Model): void;        
}
