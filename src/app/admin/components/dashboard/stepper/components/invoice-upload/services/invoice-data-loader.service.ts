import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, of } from 'rxjs';
import { RepositoryService } from '../../../services/repository.service';
import { ReferenceData } from '../models/invoice-upload-interfaces';
import { INVOICE_UPLOAD_CONSTANTS } from '../constants/invoice-upload.constants';
import { UserService } from '../../../../../../../services/user.service';
import { ToastService } from '../../../../../../../services/toast.service';
import { Truck } from '../../../../../../../models/truck.interface';

@Injectable({
  providedIn: 'root'
})
export class InvoiceDataLoaderService {
  private readonly repositoryService = inject(RepositoryService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  private cachedData: ReferenceData = {
    targetCompanies: [],
    trucks: []
  };

  loadTargetCompanies(): Observable<any[]> {
    if (this.cachedData.targetCompanies.length > 0) {
      return of(this.cachedData.targetCompanies);
    }

    return this.userService.getProfile().pipe(
      switchMap((response) => {
        return this.repositoryService.companyRelations(response.company.id);
      })
    );
  }

  loadTrucks(): Observable<Truck[]> {
    if (this.cachedData.trucks.length > 0) {
      return of(this.cachedData.trucks);
    }

    return this.repositoryService.trucks().pipe(
      switchMap((response) => of(response.results))
    );
  }

  loadAllReferenceData(): Observable<ReferenceData> {
    return new Observable(observer => {
      const referenceData: ReferenceData = {
        targetCompanies: [],
        trucks: []
      };

      let completedRequests = 0;
      const totalRequests = 2;

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          this.cachedData = referenceData;
          observer.next(referenceData);
          observer.complete();
        }
      };

      // Load target companies
      this.loadTargetCompanies().subscribe({
        next: (companies) => {
          referenceData.targetCompanies = companies;
          checkCompletion();
        },
        error: (error) => {
          this.toastService.error(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.COMPANY_LOADING);
          checkCompletion();
        }
      });

      // Load trucks
      this.loadTrucks().subscribe({
        next: (trucks) => {
          referenceData.trucks = trucks;
          checkCompletion();
        },
        error: (error) => {
          this.toastService.error(INVOICE_UPLOAD_CONSTANTS.MESSAGES.ERROR.TRUCK_LOADING);
          checkCompletion();
        }
      });
    });
  }

  clearCache(): void {
    this.cachedData = {
      targetCompanies: [],
      trucks: []
    };
  }

  getCachedData(): ReferenceData {
    return { ...this.cachedData };
  }
}
