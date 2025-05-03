import { UiPackage } from '../../admin/components/dashboard/stepper/components/ui-models/ui-package.model';
import { UiPallet } from '../../admin/components/dashboard/stepper/components/ui-models/ui-pallet.model';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';
import { PackageDetail } from '../package-detail.interface';
import { v4 as Guid } from 'uuid';
import { Pallet } from '../pallet.interface';

export function mapPackageDetailToPackage(packageDetailList: PackageDetail[]): UiPackage[] {
  const uniquePackageIds = new Set<string>();
  packageDetailList.forEach((detail) => uniquePackageIds.add(detail.package.id));

  const packageList: UiPackage[] = Array.from(uniquePackageIds).map(
    (packageId) => {
      const packageDetails = packageDetailList.filter((detail) => detail.package.id === packageId);
      const firstDetail = packageDetails[0];
      const { order, pallet } = firstDetail.package;
      const products = packageDetails.map(
        (detail) =>
          new UiProduct({
            ...detail.product,
            count: detail.count,
          })
      );

      return new UiPackage({
        id: packageId,
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
  const currentDate = new Date();

  uiPackageList.forEach((uiPackage) => {
    // For each product in the UiPackage, create a PackageDetail
    uiPackage.products.forEach((uiProduct) => {
      let packagePallet: Pallet | null = null;

      // Only create the pallet object if it exists
      if (uiPackage.pallet) {
        // Extract the pallet ID correctly, ensuring it's a string
        const palletId = uiPackage.pallet.id
          ? uiPackage.pallet.id.split('/')[0]
          : "unknown-pallet-id"; // Provide a default value if ID is undefined

        packagePallet = {
          id: palletId,
          weight: uiPackage.pallet.weight,
          dimension: uiPackage.pallet.dimension
        };
      }

      const packageDetail: PackageDetail = {
        id: Guid(), // Unique ID for the package detail
        package: {
          id: uiPackage.id,
          pallet: packagePallet,
          order: uiPackage.order
        },
        product: {
          id: uiProduct.id,
          name: uiProduct.name,
          product_type: uiProduct.product_type,
          dimension: uiProduct.dimension,
          weight_type: uiProduct.weight_type,
        },
        count: uiProduct.count
      };

      packageDetailList.push(packageDetail);
    });
  });

  return packageDetailList;
}
