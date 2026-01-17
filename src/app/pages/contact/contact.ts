import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-contact',
  standalone: false,
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  contactForm: FormGroup;
  isSubmitting = false;

  // Contact information
  contactInfo = {
    address: '123 E-Commerce Street, Digital City, DC 12345',
    phone: '+1 (555) 123-4567',
    email: 'support@manymor.com',
    hours: 'Mon - Fri: 9:00 AM - 6:00 PM'
  };

  // Social media links
  socialLinks = [
    { icon: 'bi-facebook', url: '#', name: 'Facebook' },
    { icon: 'bi-twitter', url: '#', name: 'Twitter' },
    { icon: 'bi-instagram', url: '#', name: 'Instagram' },
    { icon: 'bi-linkedin', url: '#', name: 'LinkedIn' }
  ];

  // FAQ items
  faqs = [
    {
      question: 'What are your shipping options?',
      answer: 'We offer standard (5-7 days), express (2-3 days), and overnight shipping options. Free standard shipping on orders over $50.'
    },
    {
      question: 'What is your return policy?',
      answer: 'We accept returns within 30 days of delivery. Items must be unused and in original packaging. Refunds are processed within 5-7 business days.'
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes! We ship to over 50 countries worldwide. International shipping times vary by location (typically 7-14 days).'
    },
    {
      question: 'How can I track my order?',
      answer: 'Once your order ships, you\'ll receive a tracking number via email. You can also track orders from your account dashboard.'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(3)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.toastr.error('Please fill in all required fields correctly', 'Validation Error');
      return;
    }

    this.isSubmitting = true;

    // Simulate API call
    setTimeout(() => {
      this.toastr.success('Thank you for contacting us! We\'ll get back to you soon.', 'Message Sent');
      this.contactForm.reset();
      this.isSubmitting = false;
    }, 1500);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return `${this.capitalizeFirst(fieldName)} is required`;
    }
    if (field.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field.hasError('minlength')) {
      const minLength = field.getError('minlength').requiredLength;
      return `${this.capitalizeFirst(fieldName)} must be at least ${minLength} characters`;
    }
    return '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
