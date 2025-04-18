import { Component, inject, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
  CdkDrag,
  CdkDropList
} from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { RepositoryService } from '../../services/repository.service';
import { map } from 'rxjs';

export interface Product {
  name: string;
  position: number;
  weight: number;
  price: string;
}

interface Pallet {
  id: string;
  products: Product[];
}

interface Package {
  id: string;
  pallet: Pallet | null;
}

@Component({
  selector: 'app-pallet-control',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatInputModule,
    MatTableModule,
    MatCardModule,
    CommonModule,
    CdkDropList, CdkDrag, MatIconModule
  ],
  templateUrl: './pallet-control.component.html',
  styleUrl: './pallet-control.component.scss',
})
export class PalletControlComponent implements OnInit {
  @Input() order_id!: string;
  availableProducts: Product[] = [
    { position: 1, name: 'Radiator 1', weight: 1.0079, price: '120H' },
    { position: 2, name: 'Radiator 2', weight: 4.0026, price: '111He' },
    { position: 3, name: 'Radiator 3', weight: 6.941, price: '222Li' },
    { position: 4, name: 'Radiator 4', weight: 9.0122, price: '33Be' },
    { position: 5, name: 'Radiator 5', weight: 10.811, price: '45B' },
    { position: 6, name: 'Radiator 6', weight: 12.0107, price: '67C' },
    { position: 7, name: 'Radiator 7', weight: 14.0067, price: '87N' },
    { position: 8, name: 'Radiator 8', weight: 15.9994, price: '65O' },
    { position: 9, name: 'Radiator 9', weight: 18.9984, price: '43F' },
    { position: 10, name: 'Radiator 10', weight: 20.1797, price: '34Ne' },
  ];

  availablePallets: Pallet[] = [
    { id: 'Pallet 1', products: [] },
    { id: 'Pallet 2', products: [] },
    { id: 'Pallet 3', products: [] },
    { id: 'Pallet 4', products: [] },
    { id: 'Pallet 5', products: [] },
    { id: 'Pallet 6', products: [] },
    { id: 'Pallet 7', products: [] },
    { id: 'Pallet 8', products: [] },
    { id: 'Pallet 9', products: [] },
    { id: 'Pallet 10', products: [] }
  ];

  packages: Package[] = [
    { id: 'Package 1', pallet: null },
    { id: 'Package 2', pallet: null },
    { id: 'Package 3', pallet: null }
  ];

  repository: RepositoryService = inject(RepositoryService);
  // Paket sayacı
  private packageCounter: number = 4;
  // Palet sayacı
  private palletCounter: number = 6;

  secondFormGroup: FormGroup;

  constructor(private _formBuilder: FormBuilder) {
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required],
    });
    this.replenishPallets();
  }


  pallets() {
    this.repository.pallets().subscribe(response => console.log);
  }


  // Paletleri yenile - her zaman sabit sayıda palet olmasını sağla
  replenishPallets() {
    // Mevcut paletlerin sayısını kontrol et
    const currentCount = this.availablePallets.length;

    // Her zaman 5 palet olmalı
    const neededPallets = 5 - currentCount;

    // Eğer eksikse, yeni paletler ekle
    for (let i = 0; i < neededPallets; i++) {
      const newPalletId = 'Pallet ' + this.palletCounter++;
      this.availablePallets.push({ id: newPalletId, products: [] });
    }
  }

  // Ürünleri paletlere taşıma
  dropProductToPallet(event: CdkDragDrop<Product[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
  }

  // Paleti pakete taşıma
  dropPalletToPackage(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      return; // Aynı konteyner içinde hareket etmeyi engelle
    }

    // Hedef paketin indexini bul
    const packageIndex = this.packages.findIndex(p =>
      p.id === event.container.id.replace('package-', '')
    );

    if (packageIndex === -1 || this.packages[packageIndex].pallet !== null) {
      return; // Geçersiz paket veya paket zaten dolu ise işlem yapma
    }

    // Paleti önceki konteynırdan al (derin kopya ile)
    const pallet = { ...event.previousContainer.data[event.previousIndex] };
    // Ürünlerin de derin kopyasını yap
    pallet.products = [...pallet.products];

    // Paleti yeni pakete yerleştir
    this.packages[packageIndex].pallet = pallet;

    // Paleti önceki konteynırdan kaldır
    event.previousContainer.data.splice(event.previousIndex, 1);

    // Paletleri yenile
    this.replenishPallets();

    // Yeni boş paket oluştur
    this.addNewEmptyPackage();
  }

  // Ürünü paletten geri çıkart
  removeProductFromPallet(pallet: Pallet, productIndex: number) {
    const removedProduct = pallet.products.splice(productIndex, 1)[0];
    this.availableProducts.push(removedProduct);
  }

  // Paleti paketten çıkart
  removePalletFromPackage(packageItem: Package) {
    if (packageItem.pallet) {
      // Palet içindeki tüm ürünleri ürün listesine geri ekle
      if (packageItem.pallet.products && packageItem.pallet.products.length > 0) {
        this.availableProducts.push(...packageItem.pallet.products);
        packageItem.pallet.products = [];
      }

      // Paketten paleti kaldır
      packageItem.pallet = null;

      // Paletleri yenile
      this.replenishPallets();
    }
  }

  // Yeni boş paket ekle
  addNewEmptyPackage() {
    // Boş paket sayısını kontrol et
    const emptyPackages = this.packages.filter(p => p.pallet === null);

    // Eğer 2'den az boş paket varsa yeni paket ekle
    if (emptyPackages.length < 2) {
      this.packages.push({
        id: 'Package ' + this.packageCounter++,
        pallet: null
      });
    }
  }

  // Bütün palet ürün listelerini getir
  get palletProductsLists(): string[] {
    // Tüm paletlerin ürün listelerinin ID'lerini topla
    const availablePalletIds = this.availablePallets.map(pallet => 'pallet-' + pallet.id);
    const packagedPalletIds: string[] = [];

    this.packages.forEach(pkg => {
      if (pkg.pallet) {
        packagedPalletIds.push('pallet-' + pkg.pallet.id);
      }
    });

    return [...availablePalletIds, ...packagedPalletIds];
  }

  // Bütün paket listeleri
  get packageIds(): string[] {
    return this.packages
      .filter(pkg => pkg.pallet === null) // Sadece boş paketler
      .map(pkg => 'package-' + pkg.id);
  }

  // Paket içeriğini JSON olarak al (backend'e gönderme işlemi için)
  getPackageData(): any {
    return {
      orderId: this.order_id,
      packages: this.packages
        .filter(pkg => pkg.pallet !== null) // Sadece doldurulmuş paketleri gönder
        .map(pkg => ({
          packageId: pkg.id,
          pallet: pkg.pallet ? {
            palletId: pkg.pallet.id,
            products: pkg.pallet.products.map(product => ({
              productId: product.position,
              productName: product.name,
              weight: product.weight,
              price: product.price
            }))
          } : null
        }))
    };
  }

  // Formu gönder (Backend'e veri gönderme işlemi için)
  submitForm() {
    const packageData = this.getPackageData();
    console.log('Gönderilecek veri:', packageData);
    // Burada bir HTTP isteği ile backend'e veri gönderebilirsiniz
    // this.http.post('your-api-endpoint', packageData).subscribe(...)
  }



  // products: Product[] = [
  //   {position: 1, name: 'Radiator 1', weight: 1.0079, price: '120H'},
  //   {position: 2, name: 'Radiator 2', weight: 4.0026, price: '111He'},
  //   {position: 3, name: 'Radiator 3', weight: 6.941, price: '222Li'},
  //   {position: 4, name: 'Radiator 4', weight: 9.0122, price: '33Be'},
  //   {position: 5, name: 'Radiator 5', weight: 10.811, price: '45B'},
  //   {position: 6, name: 'Radiator 6', weight: 12.0107, price: '67C'},
  //   {position: 7, name: 'Radiator 7', weight: 14.0067, price: '87N'},
  //   {position: 8, name: 'Radiator 8', weight: 15.9994, price: '65O'},
  //   {position: 9, name: 'Radiator 9', weight: 18.9984, price: '43F'},
  //   {position: 10, name: 'Radiator 10', weight: 20.1797, price: '34Ne'},
  // ];


  // packages = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];


  // pallets = ['Pallet 1', 'Pallet 2', 'Pallet 3', 'Pallet 4', 'Pallet 5', 'Pallet 6', 'Pallet 7', 'Pallet 8', 'Pallet 9', 'Pallet 10'];


  // drop1(event: CdkDragDrop<string[]>) {
  //   moveItemInArray(this.packages, event.previousIndex, event.currentIndex);
  // }

  // drop(event: CdkDragDrop<Product[]>) {
  //   if (event.previousContainer === event.container) {
  //     moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  //   } else {
  //     transferArrayItem(
  //       event.previousContainer.data,
  //       event.container.data,
  //       event.previousIndex,
  //       event.currentIndex,
  //     );
  //   }
  // }

  ngOnInit(): void {
    console.log('Order ID geldi:', this.order_id);
    this.pallets();
  }

}
