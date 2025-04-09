import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatButtonModule, MatMenuModule, MatToolbarModule, MatIconModule, CommonModule, RouterModule],
  standalone: true,
})
export class HeaderComponent {
  @Input() isToggleButton!: Boolean;
  @Output() sidenavOpen: EventEmitter<any> = new EventEmitter();

  constructor(private router: Router) {
  }

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['auth/login']);

  }

}
