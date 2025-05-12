import { UiPackage } from '../../admin/components/dashboard/stepper/components/ui-models/ui-package.model';
import { UiPallet } from '../../admin/components/dashboard/stepper/components/ui-models/ui-pallet.model';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';
import { PackageDetail } from '../package-detail.interface';
import { v4 as Guid } from 'uuid';
import { Pallet } from '../pallet.interface';

export function mapPackageDetailToPackage(packageDetailList: PackageDetail[]): UiPackage[] {
  const uniquePackageIds = new Set<string>();

  // Hem package hem de package_id olan durumlara göre ID'leri topla
  packageDetailList.forEach((detail) => {
    const packageId = detail.package ? detail.package.id : detail.package_id;
    if (packageId) uniquePackageIds.add(packageId);
  });

  const packageList: UiPackage[] = Array.from(uniquePackageIds).map(
    (packageId) => {
      // Belirli bir package ID'sine sahip tüm detayları filtrele
      const packageDetails = packageDetailList.filter((detail) => {
        const detailPackageId = detail.package ? detail.package.id : detail.package_id;
        return detailPackageId === packageId;
      });

      // İlk detaydan package bilgilerini al
      const firstDetail = packageDetails[0];

      // Package nesnesini veya ID'sini doğru şekilde ele al
      const packageData:any = firstDetail.package || {};

      // Order ve pallet bilgilerini al
      // Hem tam nesne hem de ID referansı durumlarını kontrol et
      let order, pallet;

      if (packageData.order) {
        // Tam order nesnesi
        order = packageData.order;
      } else if (packageData.order_id) {
        // Sadece order ID bilgisi var, referans oluştur
        order = { id: packageData.order_id };
      }

      if (packageData.pallet) {
        // Tam pallet nesnesi
        pallet = packageData.pallet;
      } else if (packageData.pallet_id) {
        // Sadece pallet ID bilgisi var, referans oluştur
        pallet = { id: packageData.pallet_id };
      }

      // Her PackageDetail'den ürün bilgilerini al
      const products = packageDetails.map(detail => {
        // Product nesnesini veya ID'sini doğru şekilde ele al
        let productData;

        if (detail.product) {
          // Tam product nesnesi
          productData = { ...detail.product };
        } else if (detail.product_id) {
          // Sadece product ID bilgisi var, referans oluştur
          productData = { id: detail.product_id };
        } else {
          // Hiçbir product bilgisi yok
          productData = {};
        }

        return new UiProduct({
          ...productData,
          count: detail.count,
        });
      });

      return new UiPackage({
        id: packageId,
        name: packageData.name || `Package-${packageId.substring(0, 8)}`,
        pallet: pallet ? new UiPallet({ ...pallet }) : null,
        order: order,
        products: products,
      });
    }
  );

  return packageList;
}

export function mapPackageToPackageDetail(uiPackageList: UiPackage[]): PackageDetail[] {
  const packageDetailList: PackageDetail[] = [];

  uiPackageList.forEach((uiPackage) => {
    // For each product in the UiPackage, create a PackageDetail
    uiPackage.products.forEach((uiProduct) => {
      const packageDetail: PackageDetail = {
        id: Guid(), // Unique ID for the package detail
        count: uiProduct.count
      };

      // Check if package is already saved in DB
      // Normally you would check this from a backend response flag or some other indicator
      // For this example, let's assume there's a property like 'isSavedInDb' in uiPackage
      // This might be set based on a response from your backend
      if (uiPackage.isSavedInDb === true) {
        // Mevcut bir package için ID referansı kullan
        packageDetail.package_id = uiPackage.id;
      } else {
        // Yeni bir package oluşturmak için tüm detayları içeren nesne kullan
        // Veritabanında olmayan, hesaplanmış package için tam nesne gönder
        packageDetail.package = {
          id: uiPackage.id || Guid(), // Eğer ID yoksa yeni bir ID oluştur
          name: uiPackage.name
        };

        // Pallet için ID referansı kullan (eğer varsa)
        if (uiPackage.pallet && uiPackage.pallet.id) {
          packageDetail.package.pallet_id = extractPalletId(uiPackage.pallet.id);
        }

        // Order için ID referansı kullan
        if (uiPackage.order && uiPackage.order.id) {
          packageDetail.package.order_id = uiPackage.order.id;
        }
      }

      // Product için ID referansı kullan
      packageDetail.product_id = uiProduct.id;

      packageDetailList.push(packageDetail);
    });
  });

  return packageDetailList;
}

// Helper function to extract pallet ID
function extractPalletId(palletId: string): string {
  return typeof palletId === 'string' ? palletId.split('/')[0] : palletId;
}
