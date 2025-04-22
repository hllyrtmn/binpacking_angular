import { UiPackage } from '../../admin/components/dashboard/stepper/components/ui-models/ui-package.model';
import { UiPallet } from '../../admin/components/dashboard/stepper/components/ui-models/ui-pallet.model';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';
import { PackageDetail } from '../package-detail.interface';

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
