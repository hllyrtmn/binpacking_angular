import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatLabel } from '@angular/material/form-field';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-signin',
  imports: [MatButton, MatFormField, MatInput, MatIcon, MatLabel, ReactiveFormsModule,MatCardModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.scss'
})
export class SigninComponent {

  hide = true;
  signinForm: FormGroup;

  constructor(
    public fb: FormBuilder,
    public authService: AuthService
  ) {
    this.signinForm = this.fb.group({
      username: ['muhammed'],
      password: ['1911Ahmet.']
    });
  }

  loginUser() {
    this.authService.signIn(this.signinForm.value);

  }
}
