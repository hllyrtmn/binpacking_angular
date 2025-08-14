import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/auth.guard';
import { EmployeesComponent } from './components/employees/employees.component';
import { LogisticsComponent } from './components/logistics/logistics.component';
import { OrdersComponent } from './components/orders/orders.component';
import { ProductsComponent } from './components/products/products.component';
import { ProfileComponent } from './components/profile/profile.component';
import { StepperComponent } from './components/dashboard/stepper/stepper.component';

const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: StepperComponent,
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
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
];

export default ADMIN_ROUTES;
