import { HttpClient, httpResource } from '@angular/common/http';
import { computed, Injectable, Signal, signal } from '@angular/core';
import { ApiService } from './api.service';

export class BaseRepositoryService {

  private _loading = signal<boolean>(false);
  private resourceLoadingList: Signal<boolean>[] = [];
  private _errors = signal([]);

  public errors = this._errors.asReadonly();
  public loading = computed(() => {
    let control = false;
    for (const resourceLoading of this.resourceLoadingList) {
      control = control || resourceLoading();
    }
    return this._loading() || control;
  })

  constructor(private api: ApiService, private http: HttpClient) { }
}
