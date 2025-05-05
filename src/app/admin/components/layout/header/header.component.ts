import { Component, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService } from '../../../../services/theme.service';
import {MatDividerModule} from '@angular/material/divider';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [MatButtonModule, MatMenuModule, MatToolbarModule, MatIconModule, CommonModule, RouterLink, MatDividerModule],
  standalone: true,
})
export class HeaderComponent implements OnInit {
  @ViewChild('themeMenu') themeMenu!: MatMenu;
  @Input() isToggleButton!: Boolean;
  @Output() sidenavOpen: EventEmitter<any> = new EventEmitter();

  userService  = inject(UserService)
  profilePhoto = 'https://cdn-icons-png.flaticon.com/512/219/219986.png';

  constructor(private router: Router,public themeService: ThemeService) {
  }

  ngOnInit(): void {
      this.getProfilePhoto()
  }

  getProfilePhoto(){
    this.userService.getProfile().subscribe({next:(user)=>{
      this.profilePhoto = user.profile_picture
    }})
  }

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['auth/login']);

  }

}
