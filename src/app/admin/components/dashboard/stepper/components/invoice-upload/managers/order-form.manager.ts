import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormData } from '../models/invoice-upload-interfaces';
import { FileUploadManager } from './file-upload.manager';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../../../../../../../models/order.interface';
import { RepositoryService } from '../../../services/repository.service';

@Injectable({
  providedIn: 'root'
})
export class OrderFormManager {
  private readonly formBuilder = inject(FormBuilder);
  private readonly fileUploadManager = inject(FileUploadManager);
  private readonly repositoryService = inject(RepositoryService); // RepositoryService'i inject et

  private uploadForm!: FormGroup;
  private order: Order | null = null;

  initializeForm(): FormGroup {
    this.uploadForm = this.formBuilder.group({
      fileInput: ['', [Validators.required, this.fileUploadManager.fileValidator]],
      orderName: ['', Validators.required],
      orderDate: ['', Validators.required],
      companyRelation: ['', Validators.required],
      truck: ['', Validators.required],
      weightType: ['', Validators.required],
    });

    return this.uploadForm;
  }

  getForm(): FormGroup {
    return this.uploadForm;
  }

  updateFormValidation(order: Order): void {
    if (!this.uploadForm) return;

    this.uploadForm.patchValue({
      orderName: order.name || '',
      orderDate: order.date || '',
      companyRelation: order.company_relation || '',
      truck: order.truck || '',
      weightType: order.weight_type || '',
    });
  }

  resetForm(): void {
    if (this.uploadForm) {
      this.uploadForm.reset();
    }
  }

  isFormValid(): boolean {
    return !!(
      this.order?.date &&
      this.order?.company_relation &&
      this.order?.truck &&
      this.order?.weight_type
    );
  }

  initializeNewOrder(): Order {
    this.order = {
      id: uuidv4(),
      name: '',
      date: null,
      company_relation: null,
      truck: null,
      weight_type: '',
    } as unknown as Order;

    // Yeni order oluşturulduğunda repository service'e set et
    if (this.order.id) {
      this.repositoryService.setOrderId(this.order.id);
    }

    return this.order;
  }

  setOrder(order: Order): void {
    // Immutable object'i deep clone et
    this.order = JSON.parse(JSON.stringify(order));

    console.log('🔄 Order cloned (unfrozen):', this.order);
    console.log('🔍 Cloned order frozen?', Object.isFrozen(this.order));
    if(this.order)
    this.updateFormValidation(this.order);

    // Order set edildiğinde repository service'e ID'sini bildir
    if (this.order?.id) {
      this.repositoryService.setOrderId(this.order.id);
    }
}

  getOrder(): Order | null {
    return this.order;
  }

  updateOrderField(field: string, value: any): Order {
    if (!this.order) {
      this.order = this.initializeNewOrder();
    }

    (this.order as any)[field] = value;
    this.updateFormValidation(this.order);

    // Eğer ID field'ı güncellendiyse repository service'e bildir
    if (field === 'id' && value) {
      this.repositoryService.setOrderId(value);
    }
    // Veya mevcut order'ın ID'si varsa her güncellemede bildir
    else if (this.order.id) {
      this.repositoryService.setOrderId(this.order.id);
    }

    return this.order;
  }

  updateCompanyRelation(selectedCompany: any): Order {
    if (!this.order) {
      this.order = this.initializeNewOrder();
    }

    this.order.company_relation = selectedCompany;

    // Order ID'si varsa repository service'e bildir
    if (this.order.id) {
      this.repositoryService.setOrderId(this.order.id);
    }

    return this.order;
  }

  updateTruck(selectedTruck: any): Order {
    if (!this.order) {
      this.order = this.initializeNewOrder();
    }

    this.order.truck = selectedTruck;

    // Order ID'si varsa repository service'e bildir
    if (this.order.id) {
      this.repositoryService.setOrderId(this.order.id);
    }

    return this.order;
  }

  updateWeightType(selectedWeightType: string): Order {
    if (!this.order) {
      this.order = this.initializeNewOrder();
    }

    this.order.weight_type = selectedWeightType;

    // Order ID'si varsa repository service'e bildir
    if (this.order.id) {
      this.repositoryService.setOrderId(this.order.id);
    }

    return this.order;
  }

  getFormattedDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';

    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return 'N/A';
    }

    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }

    return `${dateObj.getDate().toString().padStart(2, '0')}.${(
      dateObj.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}.${dateObj.getFullYear()}`;
  }

  // Comparison methods for template
  compareObjects(a: any, b: any): boolean {
    if (!a || !b) return false;
    return a.id === b.id;
  }

  compareCompanies(a: any, b: any): boolean {
    if (!a || !b) return false;
    return a.id === b.id || a.target_company_name === b.target_company_name;
  }

  compareWeightTypes(a: string, b: string): boolean {
    return a === b;
  }

  resetOrder(): void {
    this.order = null;
    this.resetForm();
    // Order reset edildiğinde repository service'deki ID'yi de temizle
    this.repositoryService.setOrderId('');
  }

  getFormData(): FormData {
    if (!this.uploadForm) {
      throw new Error('Form not initialized');
    }

    return this.uploadForm.value as FormData;
  }
}
