import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private userService = inject(UserService);

  // Form state
  resetForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;

  // Page state
  isValidating = true;
  isValidToken = false;
  isResetSuccessful = false;
  isLoading = false;

  // Token data
  uidb64: string | null = null;
  token: string | null = null;

  constructor() {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Extract token and uidb64 from URL
    this.route.params.subscribe(params => {
      this.uidb64 = params['uidb64'];
      this.token = params['token'];

      if (this.uidb64 && this.token) {
        this.validateToken();
      } else {
        this.isValidating = false;
        this.isValidToken = false;
      }
    });
  }

  validateToken() {
    this.isValidating = true;

    if (this.uidb64 && this.token) {
      this.userService.validatePasswordResetToken(this.uidb64, this.token).subscribe({
        next: () => {
          this.isValidating = false;
          this.isValidToken = true;
        },
        error: () => {
          this.isValidating = false;
          this.isValidToken = false;
        }
      });
    } else {
      this.isValidating = false;
      this.isValidToken = false;
    }
  }

  resetPassword() {
    if (this.resetForm.invalid) return;

    this.isLoading = true;
    const newPassword = this.resetForm.get('password')?.value;

    if (this.uidb64 && this.token) {
      this.userService.resetPassword(this.uidb64, this.token, newPassword).subscribe({
        next: () => {
          this.isLoading = false;
          this.isResetSuccessful = true;
        },
        error: (error) => {
          this.isLoading = false;

          let errorMessage = 'Şifre sıfırlama başarısız oldu';

          if (error.error && typeof error.error === 'object') {
            const firstError = Object.entries(error.error).map(([field, messages]) => {
              return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            }).join('\n');
            errorMessage = firstError || errorMessage;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }

          this.showError(errorMessage);
        }
      });
    }
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  getPasswordStrength(): string {
    const password = this.resetForm.get('password')?.value || '';

    if (password.length === 0) return '';

    let strength = 0;

    // Length
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;

    // Contains numbers
    if (/[0-9]/.test(password)) strength++;

    // Contains lowercase and uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    // Contains special characters
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'zayıf';
    if (strength <= 4) return 'orta';
    return 'güçlü';
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Kapat', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}
