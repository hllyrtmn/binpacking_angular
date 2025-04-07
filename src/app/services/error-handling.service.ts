import { query } from '@angular/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  constructor(private router: Router) { }

  handleHttpError(error: HttpErrorResponse): void {
    switch (error.status) {
      case 401:
        console.error('Unauthorized: You need to log in to access this resource.');
        break;
      case 403:
        console.error('Forbidden: You do not have permission to access this resource.');
        break;
      case 404:
        console.error('Not Found: The requested resource could not be found.');
        break;
      default:
        console.error('An unexpected error occurred:', error.message);
    }
  }

  handle(error: any): void {
    if (error instanceof HttpErrorResponse) {
      this.handleHttpError(error);
    } else {
      console.error('An unexpected error occurred:', error.message || error);
    }
    // Optionally, you can redirect to an error page or show a user-friendly message
    // this.router.navigate(['/error'],{queryParams: {error: error.message | error}}); // Redirect to a generic error page
  }

}
