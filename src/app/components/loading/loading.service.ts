import { Injectable } from "@angular/core";
import { signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class LoadingService {
    private _loading = signal(false);
    public loading = this._loading.asReadonly();

    constructor() {
    }

    loadingOn() {
        this._loading.set(true);
    }

    loadingOff() {
        this._loading.set(false);
    }

}