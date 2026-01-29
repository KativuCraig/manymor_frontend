import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-terms',
  standalone: false,
  templateUrl: './terms.html',
  styleUrls: ['./terms.css']
})
export class Terms implements OnInit {
  lastUpdated = 'January 29, 2026';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Scroll to top when component loads
    window.scrollTo(0, 0);
    this.cdr.detectChanges();
  }
}
