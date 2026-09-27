import { Component, OnInit } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Profile, UserService } from '../../core';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: false,
  selector: 'app-layout-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  constructor(
    private userService: UserService,
    public authService: AuthService,
    private router: Router
  ) {}

  currentUser: Profile;
  isAdmin: boolean;
  menuOpen = false;

  ngOnInit() {
    this.userService.currentUser.subscribe(
      (userData) => {
        this.currentUser = userData;
      }
    );

    this.authService.isAdmin.then((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    // Closes the mobile menu when a link is followed, so it doesn't stay open over the
    // page it just navigated to (also covers "Log ud", which navigates to "/").
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.menuOpen = false;
      }
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
