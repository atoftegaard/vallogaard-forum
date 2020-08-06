import { Component, OnInit } from '@angular/core';
import { Profile, UserService } from '../../core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  constructor(
    private userService: UserService,
    public authService: AuthService
  ) {}

  currentUser: Profile;
  isAdmin: boolean;

  ngOnInit() {
    this.userService.currentUser.subscribe(
      (userData) => {
        this.currentUser = userData;
      }
    );

    this.authService.isAdmin.then((isAdmin) => {
      this.isAdmin = isAdmin;
    });
  }
}
