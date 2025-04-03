import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }

  getApiUrl() {
    return ConfigService.settings.apiServer.url;
  }
}
