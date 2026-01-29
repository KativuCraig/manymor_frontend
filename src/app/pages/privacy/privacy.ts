import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-privacy',
  standalone: false,
  templateUrl: './privacy.html',
  styleUrls: ['./privacy.css']
})
export class Privacy implements OnInit {
  lastUpdated = 'January 29, 2026';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
    this.cdr.detectChanges();
  }
}
