import { Component, OnInit } from '@angular/core';
import { Profile, UserService } from '../../core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-layout-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  currentUser: Profile;

  ngOnInit() {
    this.userService.currentUser.subscribe(
      (userData) => {
        this.currentUser = userData;
      }
    );
  }
}
