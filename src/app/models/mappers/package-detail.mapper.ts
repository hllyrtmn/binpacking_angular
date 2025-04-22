import { UiPackage } from '../../admin/components/dashboard/stepper/components/ui-models/ui-package.model';
import { UiPallet } from '../../admin/components/dashboard/stepper/components/ui-models/ui-pallet.model';
import { UiProduct } from '../../admin/components/dashboard/stepper/components/ui-models/ui-product.model';
import { Order } from '../order.interface';
import { PackageDetail } from '../package-detail.interface';
import { Pallet } from '../pallet.interface';

export function mapPackageDetailToPackage(packageDetailList: PackageDetail[]) {
  let controlledPackageIdList: any = [];
  let packageDict: { [package_id: string]: {order:Order,pallet:Pallet | null | undefined} } = {};
  let productDict: {[package_id: string]: UiProduct[] } = {};
  let packageList: UiPackage[] = [];

  packageDetailList.forEach((pd) => {
    let p_id = pd.package.id;
    let productList:UiProduct[] = [];

    if (controlledPackageIdList.indexOf(p_id) !== -1) {
      return;
    }

    packageDetailList.forEach((p) => {
      if(p.package.id === p_id){
        productList.push(new UiProduct({...p.product,count:p.count}))

      }

    });

    packageDict[p_id] = {order:pd.package.order,pallet:pd.package.pallet};
    productDict[p_id] = productList;
    controlledPackageIdList.push(p_id);

  });

  Object.keys(packageDict).forEach(k=>{
    let obj = packageDict[k];

    let package1 = new UiPackage({
      id:k,
      pallet:new UiPallet({
        ...obj.pallet
      }),
      order:obj.order,
      products:productDict[k]
    });
    packageList.push(package1);

  })
return packageList;
}
