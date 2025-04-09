export interface ApiResponse<Model> {
    results: Model[],
    count: number,
    next: string,
    previous: string,
}
