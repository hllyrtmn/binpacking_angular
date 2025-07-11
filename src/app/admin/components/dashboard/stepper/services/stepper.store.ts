// stepper.store.ts - DÜZELTME

import { Injectable, WritableSignal, inject } from "@angular/core";
import { signal } from "@angular/core";
import { SessionStorageService } from "./session-storage.service";

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

    private sessionService = inject(SessionStorageService);

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

    // DÜZELTME: Signal yazma işlemini kaldırdık, sadece okuma yapıyoruz
    private isStepCompletedWithSession(stepIndex: number): boolean {
        // Session'dan kontrol et
        const sessionCompleted = this.sessionService.isStepCompleted(stepIndex + 1);

        // Local signal'dan kontrol et
        const localCompleted = this._steps[stepIndex].completed();

        // İkisinden birisi true ise true döndür
        return sessionCompleted || localCompleted;
    }

    public steps = [
        {
            id: 1,
            completed: () => this.isStepCompletedWithSession(0),
            editable: this._steps[0].editable.asReadonly(),
            is_dirty: this._steps[0].is_dirty.asReadonly()
        },
        {
            id: 2,
            completed: () => this.isStepCompletedWithSession(1),
            editable: this._steps[1].editable.asReadonly(),
            is_dirty: this._steps[1].is_dirty.asReadonly()
        },
        {
            id: 3,
            completed: () => this.isStepCompletedWithSession(2),
            editable: this._steps[2].editable.asReadonly(),
            is_dirty: this._steps[2].is_dirty.asReadonly()
        }
    ]

    resetStepper() {
        this._steps = [
            { id: 1, completed: signal(false), editable: signal(false), is_dirty: signal(false) },
            { id: 2, completed: signal(false), editable: signal(false), is_dirty: signal(false) },
            { id: 3, completed: signal(false), editable: signal(false), is_dirty: signal(false) }
        ]

        console.log('🗑️ Stepper reset - session da temizleniyor');
        this.sessionService.clearSession();
    }

    setStepStatus(step: number, status: STATUSES, status_value: boolean) {
        this._steps[--step][status].set(status_value)

        if (status === STATUSES.completed && status_value) {
            console.log(`📋 Step ${step + 1} completion status set edildi`);
        }
    }

    // YENİ: Session ile local signal'ları manuel senkronize etmek için
    syncWithSession(): void {
        console.log('🔄 Session ile local signals senkronize ediliyor...');

        for (let i = 0; i < 3; i++) {
            const sessionCompleted = this.sessionService.isStepCompleted(i + 1);
            const localCompleted = this._steps[i].completed();

            if (sessionCompleted && !localCompleted) {
                console.log(`📋 Step ${i + 1} session'dan local'a senkronize ediliyor`);
                this._steps[i].completed.set(true);
            }
        }
    }

    getSessionStatus(): {step1: boolean, step2: boolean, step3: boolean} {
        return {
            step1: this.sessionService.isStepCompleted(1),
            step2: this.sessionService.isStepCompleted(2),
            step3: this.sessionService.isStepCompleted(3)
        };
    }

    logSessionStatus(): void {
        const status = this.getSessionStatus();
        console.log('📊 Stepper Session Status:', status);
        console.log('📊 Local Signal Status:', {
            step1: this._steps[0].completed(),
            step2: this._steps[1].completed(),
            step3: this._steps[2].completed()
        });
    }
}
