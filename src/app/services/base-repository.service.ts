import { HttpClient, httpResource } from '@angular/common/http';
import { computed, Injectable, Signal, signal } from '@angular/core';
import { ApiService } from './api.service';

export class BaseRepositoryService {

  protected _loading = signal<boolean>(false);
  protected resourceLoadingList: Signal<boolean>[] = [];
  protected _errors = signal([]);

  public errors = this._errors.asReadonly();
  public loading = computed(() => {
    let control = false;
    for (const resourceLoading of this.resourceLoadingList) {
      control = control || resourceLoading();
    }
    return this._loading() || control;
  })

  constructor(protected api: ApiService, protected http: HttpClient) { }
}
