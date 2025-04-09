import { Component, OnDestroy, ViewChild } from '@angular/core';
import { ISidenavConfig } from '../../interfaces/isidenav-config';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { Breakpoints, BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { SidenavComponent } from './sidenav/sidenav.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
// https://material.angular.io/cdk/layout/overview

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [SidenavComponent, HeaderComponent, FooterComponent],

})
export class LayoutComponent implements OnDestroy {

  @ViewChild(SidenavComponent) sidenav!: SidenavComponent;

  destroyed = new Subject<any>();

  sidenavConfig: ISidenavConfig = {
    mode: 'side',
    isSidenavOpen: true,
    isToggleButtonVisible: false
  }

  displayNameMap = new Map([
    [Breakpoints.XSmall, 'XSmall'],
    [Breakpoints.Small, 'Small'],
    [Breakpoints.Medium, 'Medium'],
    [Breakpoints.Large, 'Large'],
    [Breakpoints.XLarge, 'XLarge'],
  ])

  constructor(private breakpointObserver: BreakpointObserver) {
    this.checkBreakpoints();
  }

  sidenavOpen() {
    this.sidenav.open();
  }

  checkBreakpoints() {
    this.breakpointObserver
      .observe([
        // gozlemlemek istedigin breakpointleri buraya ekliyorsun
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge
      ])
      .pipe(takeUntil(this.destroyed))
      .subscribe(result => {
        // console.log(result);  gozlemledigin breakpointler  breakpoint: boolean formatinda liste halinde result icerisinde donuyor
        // console.log(Breakpoints);
        for (const query of Object.keys(result.breakpoints)) { // listeyi donerek true olan kirilmayi buluyorsun
          if (result.breakpoints[Breakpoints.XSmall]) {
            this.sidenavConfig.isSidenavOpen = false;
            this.sidenavConfig.mode = 'over';
          } else if (result.breakpoints[Breakpoints.Small]) {
            this.sidenavConfig.isSidenavOpen = false;
            this.sidenavConfig.mode = 'over';
          } else {
            this.sidenavConfig.isSidenavOpen = true;
            this.sidenavConfig.mode = 'side';
          }
        }
        this.sidenavConfig.isToggleButtonVisible = !this.sidenavConfig.isSidenavOpen;
      });
  }

  ngOnDestroy(): void {
    this.destroyed.next(null);
    this.destroyed.complete();
  }
}
