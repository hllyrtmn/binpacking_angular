import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { User } from '../../../models/user.interface';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  userProfile: User | null = null;
  isLoading = false;
  isLoadingPicture = false;
  profilePictureUrl = 'https://cdn-icons-png.flaticon.com/512/219/219986.png';
  hidePassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  ngOnInit() {
    this.initializeForms();
    this.loadProfile();
  }

  private initializeForms() {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: ['']
    });

    this.passwordForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('new_password')?.value === g.get('confirm_password')?.value
      ? null : { mismatch: true };
  }

  loadProfile() {
    this.isLoading = true;
    this.userService.getProfile().subscribe({
      next: (user) => {
        this.userProfile = user;
        this.patchProfileForm(user);
        if (user.profile_picture) {
          this.profilePictureUrl = user.profile_picture;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('Error loading profile');
      }
    });
  }

  private patchProfileForm(user: User) {
    this.profileForm.patchValue({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || ''
    });
  }

  onUpdateProfile() {
    if (this.profileForm.invalid) return;

    this.isLoading = true;
    const profileData = this.profileForm.value;

    console.log('Sending profile data:', profileData);

    this.userService.updateProfile(profileData).subscribe({
      next: (user) => {
        this.userProfile = user;
        this.isLoading = false;
        this.showSuccess('Profile updated successfully');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Full error object:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.error);

        // Try to extract meaningful error message
        let errorMessage = 'Error updating profile';

        if (error.error) {
          // Check for field-specific errors
          if (typeof error.error === 'object') {
            const firstError = Object.entries(error.error).map(([field, messages]) => {
              return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            }).join('\n');
            errorMessage = firstError || errorMessage;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        }

        this.showError(errorMessage);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoadingPicture = true;
      this.userService.updateProfilePicture(file).subscribe({
        next: (user) => {
          this.profilePictureUrl = user.profile_picture;
          this.isLoadingPicture = false;
          this.showSuccess('Profile picture updated successfully');
        },
        error: (error) => {
          this.isLoadingPicture = false;
          this.showError('Error updating profile picture');
        }
      });
    }
  }

  onChangePassword() {
    if (this.passwordForm.invalid) return;

    this.isLoading = true;
    const passwords = this.passwordForm.value;

    console.log('Sending password data:', passwords);

    this.userService.changePassword(passwords).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSuccess('Password changed successfully');
        this.passwordForm.reset();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Full error response:', error);
        console.error('Error status:', error.status);
        console.error('Error body:', error.error);

        let errorMessage = 'Error changing password';

        if (error.error) {
          // Check for field-specific errors
          if (typeof error.error === 'object') {
            const errors: any = [];
            Object.entries(error.error).forEach(([field, messages]) => {
              // Convert field names to user-friendly names
              let fieldName = field;
              switch(field) {
                case 'old_password':
                  fieldName = 'Current password';
                  break;
                case 'new_password':
                  fieldName = 'New password';
                  break;
                case 'confirm_password':
                  fieldName = 'Confirm password';
                  break;
                case 'error':
                  fieldName = '';
                  break;
                case 'message':
                  fieldName = '';
                  break;
              }

              const messageList = Array.isArray(messages) ? messages : [messages];
              messageList.forEach(msg => {
                errors.push(fieldName ? `${fieldName}: ${msg}` : msg);
              });
            });

            if (errors.length > 0) {
              errorMessage = errors.join('\n');
            }
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          }
        }

        this.showError(errorMessage);
      }
    });
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Only allow numbers
    input.value = input.value.replace(/[^0-9]/g, '');

    // Format as 05XX XXX XX XX
    if (input.value.length >= 4) {
      input.value = input.value.slice(0, 4) + ' ' + input.value.slice(4);
    }
    if (input.value.length >= 8) {
      input.value = input.value.slice(0, 8) + ' ' + input.value.slice(8);
    }
    if (input.value.length >= 11) {
      input.value = input.value.slice(0, 11) + ' ' + input.value.slice(11);
    }

    this.profileForm.get('phone')?.setValue(input.value.replace(/\s/g, ''));
  }

  resetForm() {
    if (this.userProfile) {
      this.patchProfileForm(this.userProfile);
    }
  }

  getPasswordStrength(): string {
    const password = this.passwordForm.get('new_password')?.value || '';

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

    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}

