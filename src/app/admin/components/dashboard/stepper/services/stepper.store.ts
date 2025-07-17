import { Injectable, WritableSignal, inject, computed } from '@angular/core';
import { signal } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

interface Step {
  id: number;
  completed: WritableSignal<boolean>;
  editable: WritableSignal<boolean>;
  is_dirty: WritableSignal<boolean>;
}

export enum STATUSES {
  completed = 'completed',
  editable = 'editable',
  dirty = 'is_dirty',
}

@Injectable({ providedIn: 'root' })
export class StepperStore {
  private localStorageService = inject(LocalStorageService);

  // ✅ Private steps array
  private _steps: Step[] = [
    {
      id: 1,
      completed: signal(false),
      editable: signal(true),
      is_dirty: signal(false),
    },
    {
      id: 2,
      completed: signal(false),
      editable: signal(false),
      is_dirty: signal(false),
    },
    {
      id: 3,
      completed: signal(false),
      editable: signal(false),
      is_dirty: signal(false),
    },
  ];

  // ✅ DÜZELTME: Computed signal yerine getter kullanıyoruz
  public get steps() {
    try {
      return this._steps.map((step, index) => ({
        id: step.id,
        completed: () => this.getStepCompletedStatus(index),
        editable: step.editable.asReadonly(),
        is_dirty: step.is_dirty.asReadonly(),
      }));
    } catch (error) {

      // Fallback: return safe default structure
      return this._steps.map((step, index) => ({
        id: step.id,
        completed: () => false,
        editable: signal(index === 0).asReadonly(),
        is_dirty: signal(false).asReadonly(),
      }));
    }
  }

  // ✅ DÜZELTME: Safe step completion check
  private getStepCompletedStatus(stepIndex: number): boolean {
    try {
      // Validate step index
      if (stepIndex < 0 || stepIndex >= this._steps.length) {

        return false;
      }

      // Safe signal access
      const localCompleted = this._steps[stepIndex]?.completed?.() || false;

      // Safe storage access
      let storageCompleted = false;
      try {
        storageCompleted = this.localStorageService?.isStepCompleted?.(stepIndex + 1) || false;
      } catch (error) {

        storageCompleted = false;
      }

      return localCompleted || storageCompleted;
    } catch (error) {

      return false;
    }
  }

  constructor() {
    // ✅ Safe initialization
    try {
      this.initializeFromStorage();

    } catch (error) {

      // Graceful degradation
      this.resetToDefaults();
    }
  }

  // ✅ DÜZELTME: Safe storage initialization
  private initializeFromStorage(): void {
    try {


      if (!this.localStorageService) {

        return;
      }

      for (let i = 0; i < this._steps.length; i++) {
        try {
          const isCompleted = this.localStorageService.isStepCompleted(i + 1);

          if (isCompleted && this._steps[i]) {
            this._steps[i].completed.set(true);
            this._steps[i].editable.set(true);

            // Next step'i de editable yap
            if (i + 1 < this._steps.length && this._steps[i + 1]) {
              this._steps[i + 1].editable.set(true);
            }
          }
        } catch (error) {

        }
      }


    } catch (error) {

    }
  }

  // ✅ YENİ: Reset to safe defaults
  private resetToDefaults(): void {
    try {


      this._steps.forEach((step, index) => {
        if (step) {
          step.completed?.set?.(false);
          step.editable?.set?.(index === 0); // Only first step editable
          step.is_dirty?.set?.(false);
        }
      });


    } catch (error) {

    }
  }

  // ✅ DÜZELTME: Safe step status setter
  setStepStatus(stepNumber: number, status: STATUSES, statusValue: boolean): void {
    try {
      const stepIndex = stepNumber - 1;

      // Validate inputs
      if (stepIndex < 0 || stepIndex >= this._steps.length) {

        return;
      }

      if (!this._steps[stepIndex]) {

        return;
      }

      if (!this._steps[stepIndex][status]) {

        return;
      }

      // Safe signal update
      this._steps[stepIndex][status].set(statusValue);

      // Handle step completion logic
      if (status === STATUSES.completed && statusValue) {


        // Enable next step if exists
        if (stepIndex + 1 < this._steps.length && this._steps[stepIndex + 1]) {
          this._steps[stepIndex + 1].editable.set(true);
        }
      }

    } catch (error) {

    }
  }

  // ✅ DÜZELTME: Safe reset method
  resetStepper(): void {
    try {


      // Reset all steps safely
      this._steps.forEach((step, index) => {
        if (step) {
          step.completed?.set?.(false);
          step.editable?.set?.(index === 0); // Only first step editable
          step.is_dirty?.set?.(false);
        }
      });

      // Clear storage safely
      try {
        if (this.localStorageService?.clearStorage) {
          this.localStorageService.clearStorage();
        }
      } catch (error) {

      }



    } catch (error) {

    }
  }

  // ✅ DÜZELTME: Safe storage status getter
  getStorageStatus(): { step1: boolean; step2: boolean; step3: boolean } {
    try {
      if (!this.localStorageService?.isStepCompleted) {
        return { step1: false, step2: false, step3: false };
      }

      return {
        step1: this.localStorageService.isStepCompleted(1) || false,
        step2: this.localStorageService.isStepCompleted(2) || false,
        step3: this.localStorageService.isStepCompleted(3) || false,
      };
    } catch (error) {

      return { step1: false, step2: false, step3: false };
    }
  }

  // ✅ DÜZELTME: Safe debug logger
  logStatus(): void {
    try {
      const localSignals = this._steps.map((step, index) => ({
        [`step${index + 1}`]: {
          completed: step?.completed?.() || false,
          editable: step?.editable?.() || false,
          is_dirty: step?.is_dirty?.() || false,
        }
      }));

      console.log('📊 Stepper Status:', {
        localStorage: this.getStorageStatus(),
        localSignals: localSignals,
      });
    } catch (error) {

    }
  }

  // ✅ YENİ: Safe step access helper
  getStep(stepIndex: number): any {
    try {
      if (stepIndex < 0 || stepIndex >= this.steps.length) {

        return null;
      }

      return this.steps[stepIndex];
    } catch (error) {

      return null;
    }
  }

  // ✅ YENİ: Service health check
  isHealthy(): boolean {
    try {
      return (
        Array.isArray(this._steps) &&
        this._steps.length === 3 &&
        this._steps.every(step =>
          step &&
          typeof step.completed === 'function' &&
          typeof step.editable === 'function' &&
          typeof step.is_dirty === 'function'
        )
      );
    } catch (error) {

      return false;
    }
  }
}
