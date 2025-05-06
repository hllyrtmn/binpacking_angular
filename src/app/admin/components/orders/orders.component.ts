import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { OrderResultService } from '../services/order-result.service';
import { OrderDetailService } from '../services/order-detail.service';
import { PackageDetailService } from '../services/package-detail.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkAccordionModule } from '@angular/cdk/accordion';
import { MatIconModule } from '@angular/material/icon';
import { FileService } from '../services/file.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatButtonModule,
    CdkAccordionModule,
    MatIconModule
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  orderResultService = inject(OrderResultService);
  orderDetailService = inject(OrderDetailService);
  packageDetailService = inject(PackageDetailService);
  fileService = inject(FileService)

  @ViewChild('orderSelect') orderSelect!: MatSelect;

  // Order results data
  orderResults: any[] = [];
  filteredOrderResults: any[] = [];
  selectedOrderResult: any;

  // Order details data
  orderDetails: any = null;
  loadingDetails = false;
  detailsError: string | null = null;

  // Package details data
  packageDetails: any = null;
  groupedPackages: any[] = [];

  // File data
  files: any = null;

  // Search params
  searchTerm = '';

  ngOnInit() {
    this.loadOrderResults();
  }

  // Filter orders based on search term
  filterOrders(searchTerm: string) {
    this.searchTerm = searchTerm.toLowerCase().trim();

    if (!this.searchTerm) {
      this.filteredOrderResults = this.orderResults.slice(0, 10);
      return;
    }

    this.filteredOrderResults = this.orderResults.filter(order => {
      const orderId = order.order.id.toLowerCase();
      const companyName = order.order.company.company_name.toLowerCase();
      const country = order.order.company.country.toLowerCase();

      return orderId.includes(this.searchTerm) ||
             companyName.includes(this.searchTerm) ||
             country.includes(this.searchTerm);
    }).slice(0, 10);
  }

  togglePackage(packageGroup: any) {
    packageGroup.expanded = !packageGroup.expanded;
  }

  // Load all order results
  loadOrderResults() {
    this.orderResultService.getAll().subscribe({
      next: (response) => {
        this.orderResults = response.results;
        this.filteredOrderResults = this.orderResults.slice(0, 10);
        console.log('Order results loaded:', this.orderResults);
      },
      error: (error) => {
        console.error('Error fetching order results:', error);
      }
    });
  }

  loadOrderDetails(orderId: string) {
    this.loadingDetails = true;

    const params = { order_id: orderId.toString() || '' };
    this.orderDetailService.getAll(params).subscribe({
      next: (response) => {
        // Doğrudan response.results'ı atıyoruz
        this.orderDetails = response.results;
        this.loadingDetails = false;
        console.log('Order details loaded:', this.orderDetails);

        // Detaylar yüklendikten sonra paket bilgilerini yükle
        this.loadPackageDetails(orderId);
        this.loadFile(orderId);
      },
      error: (error) => {
        this.detailsError = 'Sipariş detayları yüklenirken bir hata oluştu.';
        this.loadingDetails = false;
        console.error('Error fetching order details:', error);
      }
    });
  }

  loadPackageDetails(orderId: string) {
    this.loadingDetails = true;

    const params = {
      order_id: orderId.toString() || '',
      limit: 400  // Çok büyük bir limit değeri
    };

    this.packageDetailService.getAll(params).subscribe({
      next: (response) => {
        this.packageDetails = response.results;
        this.loadingDetails = false;

        // Paket detaylarını aynı paketlere göre grupla
        this.groupPackageDetails();

        console.log('Package details loaded:', this.packageDetails);
        console.log('Grouped packages:', this.groupedPackages);
      },
      error: (error) => {
        this.loadingDetails = false;
        console.error('Error fetching package details:', error);
      }
    });
  }

  loadFile(orderId:string){
    this.loadingDetails = true;

    const params = {
      order_id: orderId.toString() || '',
      limit: 30
    };

    this.fileService.getAll(params).subscribe({
      next: (response) => {
        this.files = response.results;
        this.loadingDetails = false;
        console.log('File loaded:', this.files);
      },
      error: (error) => {
        this.loadingDetails = false;
        console.error('Error fetching package details:', error);
      }
    });
  }

  getFileIcon(fileType: string | null): string {
    if (!fileType) return 'insert_drive_file';

    const type = fileType.toLowerCase();

    if (type.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (type.includes('image') || type.includes('jpg') || type.includes('jpeg') || type.includes('png')) {
      return 'image';
    } else if (type.includes('excel') || type.includes('sheet') || type.includes('xlsx') || type.includes('xls')) {
      return 'table_chart';
    } else if (type.includes('word') || type.includes('doc')) {
      return 'description';
    } else if (type.includes('zip') || type.includes('rar') || type.includes('archive')) {
      return 'folder_zip';
    } else if (type.includes('text') || type.includes('txt')) {
      return 'article';
    } else if (type.includes('video')) {
      return 'videocam';
    } else if (type.includes('audio')) {
      return 'audiotrack';
    }

    return 'insert_drive_file'; // Varsayılan ikon
  }

  // Paket detaylarını grup olarak düzenle
  groupPackageDetails() {
    if (!this.packageDetails || !this.packageDetails.length) {
      this.groupedPackages = [];
      return;
    }
    console.log("package.detail",this.packageDetails.length)
    // Paketleri ID'ye göre grupla
    const packageMap = new Map();

    // Her paket detayını döngü ile gezerek gruplandır
    this.packageDetails.forEach((detail: any) => {
      const packageId = detail.package.id;

      // Eğer bu package id daha önce görülmediyse, yeni bir grup oluştur
      if (!packageMap.has(packageId)) {
        packageMap.set(packageId, {
          id: packageId,
          pallet: detail.package.pallet,
          dimension: detail.package.pallet.dimension,
          items: []
        });
      }

      // Package'a ait detayı listeye ekle
      packageMap.get(packageId).items.push(detail);
    });

    // Map'i array'e dönüştür
    this.groupedPackages = Array.from(packageMap.values());
  }

  // This method will be called when an option is selected
  onOrderResultSelected() {
    console.log('Seçilen sipariş sonucu:', this.selectedOrderResult);

    // Reset previous details and errors
    this.orderDetails = null;
    this.detailsError = null;
    this.packageDetails = null;
    this.groupedPackages = [];

    // Load order details if an order is selected
    if (this.selectedOrderResult && this.selectedOrderResult.order) {
      this.loadOrderDetails(this.selectedOrderResult.order.id);
    }
  }

  // Close the panel when clicking outside
  onClickedOutside() {
    this.orderSelect.close();
  }

  // Toplam adet hesaplama
  getTotalCount(): number {
    if (!this.orderDetails || !this.orderDetails.length) {
      return 0;
    }

    return this.orderDetails.reduce((total: number, detail: any) => {
      // Sayısal dönüşümü zorla
      const detailCount = detail.count ? Number(detail.count) : 0;
      return total + detailCount;
    }, 0);
  }

  // Toplam hacim hesaplama (depth * count)
  getTotalMeter(): number {
    if (!this.orderDetails || !this.orderDetails.length) {
      return 0;
    }

    return this.orderDetails.reduce((total: number, detail: any) => {
      const depth = detail.product?.dimension?.depth || 0;
      const count = detail.count || 0;
      return (total + (depth * count) / 1000)
    }, 0);
  }
}
