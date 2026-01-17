import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Auth Routes
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { AuthGuard } from './core/guards/auth-guard';
import { AdminGuard } from './core/guards/admin-guard';

// Layouts
import { MainLayout } from './layout/main-layout/main-layout';
import { AdminLayout } from './admin/layout/admin-layout/admin-layout';

// Main Pages
import { Home } from './pages/home/home';
import { Products} from './pages/products/products';
import { ProductDetail } from './pages/product-detail/product-detail';
import { CartComponent } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { OrderConfirmation } from './pages/order-confirmation/order-confirmation';
import { Profile } from './pages/profile/profile';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';

// Admin Pages
import { Dashboard } from './admin/dashboard/dashboard';
import { Orders } from './admin/orders/orders';
import { Categories } from './admin/categories/categories';
import { Delivery } from './admin/delivery/delivery';
import { Products as AdminProducts } from './admin/products/products';
import { Customers } from './admin/customers/customers';
import { Promotions } from './admin/promotions/promotions';

const routes: Routes = [
  // Auth Routes (No Layout)
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },

  // Public Routes (with MainLayout, no authentication required)
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', component: Home },
      { path: 'products', component: Products },
      { path: 'products/:id', component: ProductDetail },
      { path: 'about', component: About },
      { path: 'contact', component: Contact }
    ]
  },

  // Protected Customer Routes (with MainLayout, authentication required)
  {
    path: '',
    component: MainLayout,
    canActivate: [AuthGuard],
    children: [
      { path: 'cart', component: CartComponent },
      { path: 'checkout', component: Checkout },
      { path: 'order-confirmation/:id', component: OrderConfirmation },
      { path: 'profile', component: Profile }
    ]
  },
  
  // Admin Routes (with AdminLayout)
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'products', component: AdminProducts },
      { path: 'orders', component: Orders },
      { path: 'categories', component: Categories },
      { path: 'delivery', component: Delivery },
      { path: 'customers', component: Customers },
      { path: 'promotions', component: Promotions },
      { path: 'profile', component: Profile }
    ]
  },
  
  // Legacy admin-dashboard route (redirect to new structure)
  { path: 'admin-dashboard', redirectTo: '/admin/dashboard', pathMatch: 'full' },
  
  // Fallback - redirect to home instead of login
  { path: '**', redirectTo: '/' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
