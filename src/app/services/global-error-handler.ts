import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

  constructor(private router: Router, private zone: NgZone) { }

  handleError(error: any): void {
    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error);
    } else {
      console.error('An unexpected error occurred:', error.message || error);
      this.zone.run(() => {
        this.router.navigate(['error'], { queryParams: { error: error.message | error } });
      })
    }
  }

  handleHttpError(error: HttpErrorResponse): void {
    console.error(`status: ${error.status}, message: ${error.message}`);
    // this.toastService.error(`status: ${error.status}, message: ${error.message}`);
  }

}
