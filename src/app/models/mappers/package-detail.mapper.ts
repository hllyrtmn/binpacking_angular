import { UiPackage } from '../../admin/components/dashboard/stepper/components/ui-models/ui-package.model';
import { UiPallet } from '../../admin/components/dashboard/stepper/components/ui-models/ui-pallet.model';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';
import { PackageDetail } from '../package-detail.interface';
import { v4 as Guid} from 'uuid';

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

  uiPackageList.forEach((uiPackage) => {
    // For each product in the UiPackage, create a PackageDetail
    uiPackage.products.forEach((uiProduct) => {
      const packageDetail: PackageDetail = {

        package: {
          ...uiPackage,
          id: uiPackage.id,
          order: uiPackage.order,
          pallet: uiPackage.pallet ? { ...uiPackage.pallet } : null
        },
        product: {
          ...uiProduct,
          id: uiProduct.id
        },
        count: uiProduct.count,
        id: Guid(),
        deleted_time: null,
        created_at: new Date(),
        is_deleted: false,
        updated_at: new Date()
      };

      packageDetailList.push(packageDetail);
    });
  });

  return packageDetailList;
}
