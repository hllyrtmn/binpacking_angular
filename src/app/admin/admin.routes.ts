import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from '../auth/auth.guard';
import { EmployeesComponent } from './components/employees/employees.component';
import { LogisticsComponent } from './components/logistics/logistics.component';
import { OrdersComponent } from './components/orders/orders.component';
import { ProductsComponent } from './components/products/products.component';

const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'employees',
    component: EmployeesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'logistics',
    component: LogisticsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'orders',
    component: OrdersComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'products',
    component: ProductsComponent,
    canActivate: [AuthGuard],
  },
];

export default ADMIN_ROUTES;
