import { Injectable } from "@angular/core";
import { throwError } from "rxjs";
import { signal, Signal } from "@angular/core";
import { StatusChangeEvent } from "@angular/forms";

interface step {
    id: number,
    completed: Signal<boolean>,
    editable: Signal<boolean>
}

export enum STATUSES {
    completed = "completed",
    editable = "editable"
}

@Injectable({ providedIn: 'root' })
export class StepperStore {
    private _steps = [
        { id: 1, completed: signal(false), editable: signal(false) },
        { id: 2, completed: signal(false), editable: signal(false) },
        { id: 3, completed: signal(false), editable: signal(false) }
    ]
    public steps = [
        { id: 1, completed: this._steps[0].completed.asReadonly(), editable: this._steps[0].editable.asReadonly() },
        { id: 2, completed: this._steps[1].completed.asReadonly(), editable: this._steps[1].editable.asReadonly() },
        { id: 3, completed: this._steps[2].completed.asReadonly(), editable: this._steps[2].editable.asReadonly() }
    ]

    resetStepper() {
        this._steps = [
            { id: 1, completed: signal(false), editable: signal(false) },
            { id: 2, completed: signal(false), editable: signal(false) },
            { id: 3, completed: signal(false), editable: signal(false) }
        ]
    }

    setStepStatus(step: number, status: STATUSES, status_value: boolean) {
        this._steps[--step][status].set(status_value)
    }
}
