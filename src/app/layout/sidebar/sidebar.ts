import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit, OnDestroy {
  user: any = null;
  private authSubscription!: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}