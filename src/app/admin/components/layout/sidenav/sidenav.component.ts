import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, ViewChild } from '@angular/core';
import { Input } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatSidenav, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatDrawerMode } from '@angular/material/sidenav';
import { MatNestedTreeNode, MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { DomSanitizer } from '@angular/platform-browser';
import { INavListItem } from '../../../interfaces/inav-list-item';
import { RouterLink,RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatListModule, MatNavList } from "@angular/material/list";
import { MatButtonModule } from '@angular/material/button';

const NAV_LIST_ITEM: INavListItem[] = [
  {
    routerLink: ['/admin'],
    title: 'Dashboard',
    icon: 'home'
  },
  {
    routerLink: ['/admin/employees'],
    title: 'employees',
    icon: 'group'
  },
  {
    title: 'stock management',
    icon: 'home',
    children: [
      {
        routerLink: ['/admin/stock-management/warehouses/warehouse'],
        title: 'warehouses',
        icon: 'home'
      },
      {
        routerLink: ['/admin/stock-management/shelfs/shelf'],
        title: 'shelf',
        icon: 'home'
      },
      {
        routerLink: ['/admin/stock-management/products/product'],
        title: 'products',
        icon: 'home'
      },
      {
        routerLink: ['/admin/stock-management/inventory'],
        title: 'inventory',
        icon: 'inventory'
      },
    ]
  },
]



@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [MatListModule, MatButtonModule, MatSidenavModule, MatSidenavContent, RouterLink, RouterOutlet, MatIconModule, MatNestedTreeNode, CommonModule, MatTreeModule, MatSidenavModule, MatNavList]
})
export class SidenavComponent {
  @Input('mode') sidenavMode!: MatDrawerMode;
  @Input() isOpen!: boolean;
  @ViewChild('sidenav', { static: true, read: MatSidenav }) sidenav!: MatSidenav;

  treeControl = new NestedTreeControl<INavListItem>(node => node.children);
  dataSource = new MatTreeNestedDataSource<INavListItem>();

  constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
    // this.matIconRegistry.addSvgIcon(
    //   'productIcon',
    //   this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/product.svg'))
    //   .addSvgIcon(
    //     'shelfIcon',
    //     this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/shelf.svg')
    //   ).addSvgIcon(
    //     'shelf2Icon',
    //     this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/shelf2.svg')
    //   ).addSvgIcon(
    //     'shelf3Icon',
    //     this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/shelf3.svg')
    //   );
    this.dataSource.data = NAV_LIST_ITEM;
  }

  hasChild = (_: number, node: INavListItem) => !!node.children && node.children.length > 0;

  open() {
    this.sidenav.open();
  }

  listItemClasses(title: string) {
    return { 'slide-text': title.length > 12 }
  }

}
