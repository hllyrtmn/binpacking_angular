import { PageEvent } from "@angular/material/paginator";
import { IRequiredPermission, IPermission } from '../interfaces/permission.interface';

export function calculateLimitOffset(pageEvent?: PageEvent) {
    let limit = pageEvent ? pageEvent.pageSize : 10;
    let offset = pageEvent ? limit * pageEvent.pageIndex : 0;
    return { limit: limit, offset: offset }
}



export function isEquelPermissions(
    permission: IPermission,
    requiredPermission: IRequiredPermission
): boolean {
    if (!!requiredPermission.id) {
        return permission.id === requiredPermission.id
    }
    return permission.codename === requiredPermission.codename &&
        permission.content_type.app_label === requiredPermission.content_type.app_label &&
        permission.content_type.model === requiredPermission.content_type.model
}