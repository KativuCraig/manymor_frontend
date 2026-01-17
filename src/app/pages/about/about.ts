import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: false,
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {
  // Team members
  teamMembers = [
    {
      name: 'John Doe',
      position: 'CEO & Founder',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
      bio: 'Visionary leader with 15+ years in e-commerce'
    },
    {
      name: 'Jane Smith',
      position: 'Chief Technology Officer',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      bio: 'Tech expert driving innovation'
    },
    {
      name: 'Mike Johnson',
      position: 'Head of Operations',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
      bio: 'Operations specialist ensuring smooth delivery'
    },
    {
      name: 'Sarah Williams',
      position: 'Marketing Director',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
      bio: 'Creative marketer building our brand'
    }
  ];

  // Company values
  values = [
    {
      icon: 'bi-shield-check',
      title: 'Quality Assurance',
      description: 'We ensure every product meets our high standards before reaching you.'
    },
    {
      icon: 'bi-lightning-charge',
      title: 'Fast Delivery',
      description: 'Quick and reliable shipping to get your products to you on time.'
    },
    {
      icon: 'bi-headset',
      title: '24/7 Support',
      description: 'Our customer service team is always ready to help you.'
    },
    {
      icon: 'bi-heart',
      title: 'Customer First',
      description: 'Your satisfaction is our top priority in everything we do.'
    }
  ];

  // Milestones
  milestones = [
    { year: '2018', event: 'Company Founded' },
    { year: '2019', event: '10,000+ Customers' },
    { year: '2020', event: 'Expanded to 5 Countries' },
    { year: '2021', event: '100,000+ Products Sold' },
    { year: '2024', event: 'Launched Mobile App' },
    { year: '2026', event: '1 Million+ Happy Customers' }
  ];

  constructor() {}
}
