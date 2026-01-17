import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';


import { AppRoutingModule } from './app-routing-module';
import { CoreModule } from './core/core-module';
import { AuthInterceptor } from './core/interceptors/auth-interceptor';
import { App } from './app';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { MainLayout } from './layout/main-layout/main-layout';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Sidebar } from './layout/sidebar/sidebar';
import { Home } from './pages/home/home';
import { Products } from './pages/products/products';
import { ProductDetail } from './pages/product-detail/product-detail';
import { CartComponent } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { OrderConfirmation } from './pages/order-confirmation/order-confirmation';
import { Profile } from './pages/profile/profile';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Dashboard } from './admin/dashboard/dashboard';
import { Orders } from './admin/orders/orders';
import { Categories } from './admin/categories/categories';
import { Delivery } from './admin/delivery/delivery';
import { Products as AdminProducts } from './admin/products/products';
import { AdminLayout } from './admin/layout/admin-layout/admin-layout';
import { Customers } from './admin/customers/customers';
import { HomeCarouselComponent } from './pages/home/home-carousel/home-carousel';
import { Promotions } from './admin/promotions/promotions';

@NgModule({
  declarations: [
    App,
    Login,
    Register,
    ForgotPassword,
    MainLayout,
    Header,
    Footer,
    Sidebar,
    Home,
    Products,
    ProductDetail,
    CartComponent,
    Checkout,
    OrderConfirmation,
    Profile,
    About,
    Contact,
    Dashboard,
    Orders,
    Categories,
    Delivery,
    AdminProducts,
    AdminLayout,
    Customers,
    HomeCarouselComponent,
    Promotions
  ],
  imports: [
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true,
      closeButton: true
    }),
    BrowserModule,
  AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CoreModule,
  ],
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule { }
