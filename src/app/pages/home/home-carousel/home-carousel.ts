import { Component, OnInit, OnDestroy } from '@angular/core';
import { PromotionService } from '../../../core/services/promotion.service';
import { CarouselPromotion } from '../../../core/models/promotion.model';

@Component({
  selector: 'app-home-carousel',
  standalone: false,
  templateUrl: './home-carousel.html',
  styleUrls: ['./home-carousel.css']
})
export class HomeCarouselComponent implements OnInit, OnDestroy {
  promotions: CarouselPromotion[] = [];
  currentSlide = 0;
  autoPlayInterval: any;
  isLoading = true;
  error: string | null = null;

  constructor(private promotionService: PromotionService) { }

  ngOnInit(): void {
    this.loadPromotions();
  }

  loadPromotions(): void {
    this.promotionService.getActiveCarouselPromotions().subscribe({
      next: (promotions) => {
        this.promotions = promotions.sort((a, b) => a.display_order - b.display_order);
        this.isLoading = false;
        if (this.promotions.length > 1) {
          this.startAutoPlay();
        }
      },
      error: (error) => {
        console.error('Error loading carousel promotions:', error);
        this.error = 'Failed to load promotions';
        this.isLoading = false;
      }
    });
  }

  startAutoPlay(): void {
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Change slide every 5 seconds
  }

  stopAutoPlay(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.promotions.length;
  }

  previousSlide(): void {
    this.currentSlide = this.currentSlide === 0 
      ? this.promotions.length - 1 
      : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  onPromotionClick(promotion: CarouselPromotion): void {
    if (promotion.link_url) {
      window.location.href = promotion.link_url;
    }
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }
}
