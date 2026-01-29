# ClicknPay Payment Integration Summary

## 📋 Overview
This document summarizes the ClicknPay payment gateway integration implemented in the backend, including API endpoints, request/response formats, and frontend integration guide.

---

## 🔧 Backend Changes Made

### 1. **New Files Created**
- `payment_services/clicknpay.py` - ClicknPay service integration
- `payment_services/__init__.py` - Package initializer

### 2. **Modified Files**
- `orders/models.py` - Added `payment_reference` field and changed default `payment_status` to 'PENDING'
- `orders/views.py` - Updated checkout flow and added payment endpoints
- `orders/urls.py` - Added new payment-related URLs
- `requirements.txt` - Added `requests==2.32.3`

### 3. **Database Changes**
- Added `payment_reference` field to Order model (stores ClicknPay clientReference)
- Changed `payment_status` default from 'PAID' to 'PENDING'

### 4. **Environment Variables Required**
```env
CLICKNPAY_BASE_URL=https://your-clicknpay-api-url
CLICKNPAY_PUBLIC_UNIQUE_ID=your-public-unique-id
```

---

## 🌐 API Endpoints for Frontend

### **1. Checkout with Payment**
Creates an order and initiates ClicknPay payment.

**Endpoint:** `POST /api/orders/checkout/`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "phone_number": "+263771234567",
  "shipping_address": "123 Main Street, Harare, Zimbabwe",
  "return_url": "https://yourfrontend.com/payment-success"
}
```

**Success Response (201 Created):**
```json
{
  "order": {
    "id": 1,
    "user": 1,
    "total_amount": "150.00",
    "status": "PLACED",
    "payment_status": "PENDING",
    "payment_reference": "550e8400-e29b-41d4-a716-446655440000",
    "shipping_address": "123 Main Street, Harare, Zimbabwe",
    "created_at": "2026-01-29T10:30:00Z",
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "name": "Product Name",
          "price": "50.00"
        },
        "quantity": 3,
        "unit_price": "50.00"
      }
    ]
  },
  "payment": {
    "clientReference": "550e8400-e29b-41d4-a716-446655440000",
    "paymeURL": "https://clicknpay.com/pay/xyz123",
    "status": "PAYMENT_INITIATED"
  }
}
```

**Error Responses:**
```json
// Empty Cart (400)
{
  "detail": "Cart is empty"
}

// Missing Phone Number (400)
{
  "detail": "Phone number is required for payment"
}

// Payment Initialization Failed (500)
{
  "detail": "Payment initialization failed: {error_message}"
}
```

**Frontend Action After Success:**
- Redirect user to `payment.paymeURL` to complete payment
- Store `order.id` and `payment.clientReference` for tracking

---

### **2. Check Payment Status**
Manually check if an order's payment has been completed.

**Endpoint:** `GET /api/orders/{order_id}/check-payment/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "order": {
    "id": 1,
    "total_amount": "150.00",
    "status": "PLACED",
    "payment_status": "PAID",
    "payment_reference": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-29T10:30:00Z",
    "items": [...]
  },
  "payment_status": {
    "status": "PAID",
    "clientReference": "550e8400-e29b-41d4-a716-446655440000",
    "paymentGatewayReference": "PG12345",
    "orderDate": "2026-01-29"
  },
  "message": "Payment completed successfully"
}
```

**Frontend Usage:**
- Call this endpoint after user returns from payment
- Poll this endpoint to check payment status
- Update UI based on `payment_status`

---

### **3. Payment Callback (Webhook)**
Receives payment confirmation from ClicknPay (called by ClicknPay, not frontend).

**Endpoint:** `POST /api/orders/payment-callback/`

**Headers:**
```
Content-Type: application/json
```
**Note:** No authentication required (webhook endpoint)

**Request Body (from ClicknPay):**
```json
{
  "clientReference": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response - Payment Completed (200 OK):**
```json
{
  "detail": "Payment confirmed",
  "status": "SUCCESS",
  "order_id": 1
}
```

**Response - Payment Pending (202 Accepted):**
```json
{
  "detail": "Payment is being processed",
  "status": "INITIATED",
  "order_id": 1,
  "message": "Please check back later or complete the payment"
}
```

**Response - Payment Failed (400 Bad Request):**
```json
{
  "detail": "Payment failed or cancelled",
  "status": "FAILED",
  "order_id": 1
}
```



### **4. Get Order Details**
Retrieve details of a specific order.

**Endpoint:** `GET /api/orders/{order_id}/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "user": 1,
  "total_amount": "150.00",
  "status": "PLACED",
  "payment_status": "PAID",
  "payment_reference": "550e8400-e29b-41d4-a716-446655440000",
  "shipping_address": "123 Main Street, Harare, Zimbabwe",
  "created_at": "2026-01-29T10:30:00Z",
  "items": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Product Name",
        "image": "/media/products/image.jpg",
        "price": "50.00"
      },
      "quantity": 3,
      "unit_price": "50.00"
    }
  ]
}
```

---

### **5. List All Orders**
Get all orders for the authenticated user.

**Endpoint:** `GET /api/orders/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "total_amount": "150.00",
    "status": "PLACED",
    "payment_status": "PAID",
    "created_at": "2026-01-29T10:30:00Z",
    "items": [...]
  },
  {
    "id": 2,
    "total_amount": "200.00",
    "status": "PLACED",
    "payment_status": "PENDING",
    "created_at": "2026-01-28T15:20:00Z",
    "items": [...]
  }
]
```

---

## 💳 Payment Status Flow

```
PENDING → Payment initiated, user needs to pay
   ↓
INITIATED → Payment link clicked, processing
   ↓
PAID → Payment successful ✅
   ↓
Email sent to customer
```

**Alternative Failure Flow:**
```
PENDING → INITIATED → FAILED/CANCELLED ❌
```

---

## 🎯 Frontend Integration Guide

### **Step 1: Checkout Flow**

```javascript
// 1. User clicks "Checkout"
const checkoutData = {
  phone_number: userPhone,
  shipping_address: userAddress,
  return_url: `${window.location.origin}/payment-success`
};

const response = await fetch('/api/orders/checkout/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(checkoutData)
});

const data = await response.json();

if (response.ok) {
  // 2. Store order info
  localStorage.setItem('pendingOrderId', data.order.id);
  localStorage.setItem('clientReference', data.payment.clientReference);
  
  // 3. Redirect to ClicknPay
  window.location.href = data.payment.paymeURL;
}
```

### **Step 2: Payment Return Handler**

```javascript
// When user returns from ClicknPay (on /payment-success page)
useEffect(() => {
  const orderId = localStorage.getItem('pendingOrderId');
  
  if (orderId) {
    checkPaymentStatus(orderId);
  }
}, []);

async function checkPaymentStatus(orderId) {
  const response = await fetch(`/api/orders/${orderId}/check-payment/`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const data = await response.json();
  
  if (data.order.payment_status === 'PAID') {
    // Payment successful!
    showSuccessMessage();
    localStorage.removeItem('pendingOrderId');
    localStorage.removeItem('clientReference');
    
    // Redirect to order details
    navigate(`/orders/${orderId}`);
  } else if (data.order.payment_status === 'PENDING') {
    // Still processing
    showPendingMessage();
    
    // Optional: Poll again after 3 seconds
    setTimeout(() => checkPaymentStatus(orderId), 3000);
  } else {
    // Payment failed
    showErrorMessage();
  }
}
```

### **Step 3: Order Status Display**

```javascript
// Display payment status badge
function getPaymentStatusBadge(status) {
  const statusConfig = {
    'PAID': { color: 'green', text: 'Paid', icon: '✓' },
    'PENDING': { color: 'orange', text: 'Pending', icon: '⏳' },
    'FAILED': { color: 'red', text: 'Failed', icon: '✗' },
    'INITIATED': { color: 'blue', text: 'Processing', icon: '🔄' }
  };
  
  return statusConfig[status] || { color: 'gray', text: status, icon: '?' };
}
```

---

## 🔍 Payment Status Values

| Status | Meaning | Action Required |
|--------|---------|-----------------|
| `PENDING` | Payment not yet initiated | User needs to complete checkout |
| `INITIATED` | Payment link opened, processing | Wait or redirect to payment URL |
| `PAID` | Payment successful | Show success, send confirmation |
| `FAILED` | Payment failed | Notify user, allow retry |
| `CANCELLED` | Payment cancelled by user | Allow retry |

---

## 🚀 Testing Checklist

### **Backend Testing**
- [x] Checkout creates order with PENDING status
- [x] Payment reference is stored correctly
- [x] Webhook handles INITIATED status
- [x] Webhook handles PAID status
- [x] Webhook handles FAILED status
- [x] Check-payment endpoint updates order status
- [x] Email sent when payment confirmed

### **Frontend Testing**
- [ ] Checkout redirects to paymeURL
- [ ] Return URL receives user after payment
- [ ] Payment status check works
- [ ] UI updates based on payment status
- [ ] Failed payment shows error
- [ ] Order history shows payment status

---

## 🔒 Security Notes

1. **Webhook Security:** Consider adding signature verification for ClicknPay webhooks
2. **HTTPS Required:** Payment URLs must use HTTPS in production
3. **CORS Configuration:** Ensure frontend domain is allowed in Django CORS settings
4. **JWT Tokens:** Ensure tokens are stored securely (httpOnly cookies recommended)

---

#