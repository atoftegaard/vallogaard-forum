import { Component, OnInit } from '@angular/core';
import { Functions, httpsCallableFromURL } from '@angular/fire/functions';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface Member {
  name: string;
  email: string;
  address: string;
}

@Component({
  standalone: false,
  selector: 'app-medlemmer-list',
  templateUrl: './medlemmer-list.component.html',
  styleUrls: ['./medlemmer-list.component.css']
})
export class MedlemmerListComponent implements OnInit {

  constructor(
    private functions: Functions,
    public router: Router,
    private authService: AuthService) { }

  members: Member[] = [];
  loading: boolean;
  error: string;

  async ngOnInit() {
    this.loading = true;
    await this.authService.loggedIn();

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    // Only returns name/email/address for active members - filtering and field selection
    // happen server-side so the client never has access to anything more.
    try {
      const callable = httpsCallableFromURL<void, Member[]>(
        this.functions, 'https://us-central1-vallogaard-2019.cloudfunctions.net/listActiveMembers');
      const result = await callable();
      this.members = result.data;
    } catch (error) {
      console.error('Error loading members: ', error);
      this.error = 'Kunne ikke hente listen over brugere.';
    } finally {
      this.loading = false;
    }
  }
}
