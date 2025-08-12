import { Routes } from '@angular/router';
import AUTH_ROUTES from './auth/auth.routes';
import ADMIN_ROUTES from './admin/admin.routes';
import { LayoutComponent } from './admin/components/layout/layout.component';
import { ErrorComponent } from './components/error/error.component';


export const routes: Routes = [
    {
        pathMatch: 'full',
        path: '',
        redirectTo: 'admin'
    },
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
        path: 'error',
        component: ErrorComponent,
    },
    {
        path: '**', redirectTo: 'error'
    },
];
