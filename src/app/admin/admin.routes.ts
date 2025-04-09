import { Routes } from "@angular/router";
import { DashboardComponent } from "./components/dashboard/dashboard.component";
import { AuthGuard } from "../auth/auth.guard";

const ADMIN_ROUTES: Routes = [{
    path: '', component: DashboardComponent, canActivate: [AuthGuard]
}];


export default ADMIN_ROUTES;