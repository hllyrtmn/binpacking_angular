import { Injectable } from "@angular/core";
import { throwError } from "rxjs";
import { signal } from "@angular/core";


@Injectable({providedIn: 'root'})
export class StepperStore {
    private _stepFirstCompleted = signal(false);
    private _stepSecondCompleted = signal(false);
    private _stepThirdCompleted = signal(false);

    public stepFirstCompleted = this._stepFirstCompleted.asReadonly()
    public stepSecondCompleted = this._stepSecondCompleted.asReadonly()
    public stepThirdCompleted = this._stepThirdCompleted.asReadonly()


    resetStepper(){
        console.log("stepper resetlendi")
    }

    setStepCompletedStatus(step:number,status:boolean){
        if(step === 1){
            this._stepFirstCompleted.set(status)
        }
        else if(step === 2){
            this._stepSecondCompleted.set(status)
        }
        else if(step === 3){
            this._stepThirdCompleted.set(status)
        }
        else{
            console.error("wrong attribute values")
        }
    }

}
