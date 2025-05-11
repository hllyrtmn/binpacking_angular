import { Injectable, WritableSignal } from "@angular/core";
import { signal } from "@angular/core";

interface step {
    id: number,
    completed: WritableSignal<boolean>,
    editable: WritableSignal<boolean>,
    is_dirty: WritableSignal<boolean>,
}


export enum STATUSES {
    completed = "completed",
    editable = "editable",
    dirty = "is_dirty"
}

@Injectable({ providedIn: 'root' })
export class StepperStore {


    private _steps: step[] = [
        {
            id: 1,
            completed: signal(false),
            editable: signal(false),
            is_dirty: signal(false)
        },
        {
            id: 2,
            completed: signal(false),
            editable: signal(false),
            is_dirty: signal(false)
        },
        {
            id: 3,
            completed: signal(false),
            editable: signal(false),
            is_dirty: signal(false)
        }
    ]

    public steps = [
        {
            id: 1,
            completed: this._steps[0].completed.asReadonly(),
            editable: this._steps[0].editable.asReadonly(),
            is_dirty: this._steps[0].is_dirty.asReadonly()
        },
        {
            id: 2,
            completed: this._steps[1].completed.asReadonly(),
            editable: this._steps[1].editable.asReadonly(),
            is_dirty: this._steps[0].is_dirty.asReadonly()
        },
        {
            id: 3,
            completed: this._steps[2].completed.asReadonly(),
            editable: this._steps[2].editable.asReadonly(),
            is_dirty: this._steps[0].is_dirty.asReadonly()
        }
    ]

    resetStepper() {
        this._steps = [
            { id: 1, completed: signal(false), editable: signal(false), is_dirty: signal(false) },
            { id: 2, completed: signal(false), editable: signal(false), is_dirty: signal(false) },
            { id: 3, completed: signal(false), editable: signal(false), is_dirty: signal(false) }
        ]
    }

    setStepStatus(step: number, status: STATUSES, status_value: boolean) {
        this._steps[--step][status].set(status_value)
    }
}
