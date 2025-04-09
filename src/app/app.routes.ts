import { Routes } from '@angular/router';
import AUTH_ROUTES from './auth/auth.routes';
import ADMIN_ROUTES from './admin/admin.routes';
import { LayoutComponent } from './admin/components/layout/layout.component';
import { EmployeesComponent } from './admin/components/employees/employees.component';


export const routes: Routes = [
    {
        path: 'auth',
        children: AUTH_ROUTES
    },
    {
        path: 'admin',
        component: LayoutComponent,
        children: ADMIN_ROUTES
    },
    {
        path: 'employees',
        component: EmployeesComponent,
    }
];
