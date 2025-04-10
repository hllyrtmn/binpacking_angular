import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../../../services/theme.service';
import {MatDividerModule} from '@angular/material/divider';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatButtonModule, MatMenuModule, MatToolbarModule, MatIconModule, CommonModule, RouterLink, MatDividerModule],
  standalone: true,
})
export class HeaderComponent {
  @ViewChild('themeMenu') themeMenu!: MatMenu;
  @Input() isToggleButton!: Boolean;
  @Output() sidenavOpen: EventEmitter<any> = new EventEmitter();

  constructor(private router: Router,public themeService: ThemeService) {
  }

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['auth/login']);

  }

}
