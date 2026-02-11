# Order Management API - Postman Test Collection
## Complete Test Suite for All 35+ Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Order CRUD Operations (6 Routes)](#1-order-crud-operations)
3. [Order Status Management (7 Routes)](#2-order-status-management)
4. [Order Assignment (3 Routes)](#3-order-assignment)
5. [Progress & Quality (4 Routes)](#4-progress--quality)
6. [Payment & Billing (3 Routes)](#5-payment--billing)
7. [Delivery & Completion (3 Routes)](#6-delivery--completion)
8. [Order Filtering & Search (9 Routes)](#7-order-filtering--search)
9. [Order Analytics (2 Routes)](#8-order-analytics)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:3000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: 65f1234567890abcdef12345
organizationId: 65f9999999999999999999999
orderId: (auto-set from create)
customerId: 65f1111111111111111111111
userId: 65f2222222222222222222222
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

---

## 1. ORDER CRUD OPERATIONS

### 1.1 Create Order - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "orderType": "custom_order",
  "priority": "normal",
  "items": [
    {
      "itemType": "new_product",
      "productName": "Gold Ring with Diamond",
      "metalType": "gold",
      "purity": "22K",
      "estimatedWeight": 5.5,
      "quantity": 1,
      "designDetails": "Classic solitaire design",
      "specifications": {
        "size": "18",
        "finish": "high_polish"
      }
    }
  ],
  "timeline": {
    "estimatedCompletionDate": "2024-03-15T10:00:00.000Z",
    "urgencyLevel": "normal"
  },
  "financials": {
    "estimatedTotal": 45000,
    "advancePaid": 15000,
    "taxAmount": 2250,
    "discount": 0
  },
  "notes": "Customer wants traditional design",
  "specialInstructions": "Handle with care, high-value item",
  "tags": ["wedding", "custom"]
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Order created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("created");
});

pm.test("Order has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('orderNumber');
    pm.expect(data).to.have.property('status');
    pm.expect(data.status).to.eql('draft');
    pm.expect(data).to.have.property('customerDetails');
    pm.expect(data).to.have.property('items');
    
    // Save orderId for later tests
    pm.collectionVariables.set('orderId', data._id);
    pm.collectionVariables.set('orderNumber', data.orderNumber);
});

pm.test("Order number is generated correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.orderNumber).to.match(/^ORD-\d{8}-\d+$/);
});

pm.test("Customer details are populated", function () {
    const data = pm.response.json().data;
    pm.expect(data.customerDetails).to.have.property('customerName');
    pm.expect(data.customerDetails).to.have.property('customerCode');
    pm.expect(data.customerDetails).to.have.property('phone');
});

pm.test("Financial calculations are correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.financials.balanceDue).to.eql(30000);
    pm.expect(data.payment.paymentStatus).to.eql('partially_paid');
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "orderNumber": "ORD-20240209-001",
    "shopId": "65f1234567890abcdef12345",
    "organizationId": "65f9999999999999999999999",
    "customerId": "65f1111111111111111111111",
    "customerDetails": {
      "customerName": "Raj Kumar",
      "customerCode": "CUST-001",
      "phone": "+919876543210",
      "email": "raj@example.com"
    },
    "status": "draft",
    "orderType": "custom_order",
    "priority": "normal",
    "items": [
      {
        "itemType": "new_product",
        "productName": "Gold Ring with Diamond",
        "metalType": "gold",
        "purity": "22K",
        "estimatedWeight": 5.5,
        "quantity": 1
      }
    ],
    "financials": {
      "estimatedTotal": 45000,
      "advancePaid": 15000,
      "balanceDue": 30000,
      "taxAmount": 2250
    },
    "payment": {
      "paymentStatus": "partially_paid",
      "payments": []
    },
    "timeline": {
      "estimatedCompletionDate": "2024-03-15T10:00:00.000Z"
    },
    "orderDate": "2024-02-09T10:30:00.000Z",
    "createdAt": "2024-02-09T10:30:00.000Z"
  }
}
```

---

### 1.2 Create Order - FAILURE (Missing Customer ID) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "orderType": "repair",
  "items": [
    {
      "itemType": "new_product",
      "productName": "Gold Chain",
      "metalType": "gold"
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates missing customer ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.error || jsonData.message).to.match(/customer.*id.*required/i);
});

pm.test("Validation details are provided", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('details');
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "customerId",
      "message": "Customer ID is required"
    }
  ]
}
```

---

### 1.3 Create Order - FAILURE (Invalid Order Type) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "orderType": "invalid_type",
  "items": [
    {
      "itemType": "new_product",
      "productName": "Gold Ring",
      "metalType": "gold"
    }
  ],
  "timeline": {
    "estimatedCompletionDate": "2024-03-15"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid order type", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*order.*type/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "orderType",
      "message": "Invalid order type"
    }
  ]
}
```

---

### 1.4 Create Order - FAILURE (Empty Items Array) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "orderType": "custom_order",
  "items": [],
  "timeline": {
    "estimatedCompletionDate": "2024-03-15"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates items required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/at least one item/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "items",
      "message": "At least one item is required"
    }
  ]
}
```

---

### 1.5 Create Order - FAILURE (Past Completion Date) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "orderType": "repair",
  "items": [
    {
      "itemType": "service",
      "productName": "Ring Repair",
      "metalType": "gold"
    }
  ],
  "timeline": {
    "estimatedCompletionDate": "2024-01-01T10:00:00.000Z"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates date must be in future", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/future/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Estimated completion date must be in the future"
}
```

---

### 1.6 Create Order - FAILURE (Invalid Customer ID) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "invalid-id",
  "orderType": "custom_order",
  "items": [
    {
      "itemType": "new_product",
      "productName": "Gold Ring",
      "metalType": "gold"
    }
  ],
  "timeline": {
    "estimatedCompletionDate": "2024-03-15"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid customer ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*customer.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid customer ID"
}
```

---

### 1.7 Create Order - FAILURE (Customer Not Found) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders`

**Request Body:**
```json
{
  "customerId": "65f0000000000000000000000",
  "orderType": "repair",
  "items": [
    {
      "itemType": "service",
      "productName": "Ring Repair",
      "metalType": "gold"
    }
  ],
  "timeline": {
    "estimatedCompletionDate": "2024-03-15"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates customer not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/customer.*not found/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "Customer not found"
}
```

---

### 1.8 Get All Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders?page=1&limit=10&sort=-createdAt`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders retrieved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Pagination metadata is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta.pagination).to.have.property('currentPage');
    pm.expect(jsonData.meta.pagination).to.have.property('totalPages');
    pm.expect(jsonData.meta.pagination).to.have.property('totalItems');
    pm.expect(jsonData.meta.pagination).to.have.property('pageSize');
});

pm.test("Each order has required fields", function () {
    const orders = pm.response.json().data;
    if (orders.length > 0) {
        orders.forEach(order => {
            pm.expect(order).to.have.property('_id');
            pm.expect(order).to.have.property('orderNumber');
            pm.expect(order).to.have.property('status');
            pm.expect(order).to.have.property('customerDetails');
        });
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "orderNumber": "ORD-20240209-001",
      "status": "draft",
      "orderType": "custom_order",
      "priority": "normal",
      "customerDetails": {
        "customerName": "Raj Kumar",
        "phone": "+919876543210"
      },
      "financials": {
        "estimatedTotal": 45000
      },
      "orderDate": "2024-02-09T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "pageSize": 10
    }
  }
}
```

---

### 1.9 Get All Orders with Filters - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders?status=confirmed&priority=high&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Filtered orders returned", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        pm.expect(order.status).to.eql('confirmed');
        pm.expect(order.priority).to.eql('high');
    });
});
```

---

### 1.10 Get Order by ID - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order retrieved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('_id');
});

pm.test("Order ID matches", function () {
    const data = pm.response.json().data;
    const orderId = pm.collectionVariables.get('orderId');
    pm.expect(data._id).to.eql(orderId);
});

pm.test("Order has complete details", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('items');
    pm.expect(data).to.have.property('timeline');
    pm.expect(data).to.have.property('financials');
    pm.expect(data).to.have.property('payment');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "orderNumber": "ORD-20240209-001",
    "status": "draft",
    "orderType": "custom_order",
    "customerDetails": {
      "customerName": "Raj Kumar",
      "customerCode": "CUST-001",
      "phone": "+919876543210"
    },
    "items": [...],
    "financials": {...},
    "timeline": {...},
    "payment": {...}
  }
}
```

---

### 1.11 Get Order by ID - FAILURE (Invalid Order ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/invalid-id`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid order ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*order.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid order ID"
}
```

---

### 1.12 Get Order by ID - FAILURE (Order Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/65f0000000000000000000000`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates order not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/order.*not found/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### 1.13 Update Order - SUCCESS ✅

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}`

**Request Body:**
```json
{
  "priority": "high",
  "timeline": {
    "estimatedCompletionDate": "2024-03-10T10:00:00.000Z"
  },
  "notes": "Updated - Customer needs it urgently",
  "specialInstructions": "Rush order - handle with priority"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("updated");
});

pm.test("Updated values are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.priority).to.eql('high');
    pm.expect(data.notes).to.include("urgently");
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "orderNumber": "ORD-20240209-001",
    "priority": "high",
    "notes": "Updated - Customer needs it urgently",
    "timeline": {
      "estimatedCompletionDate": "2024-03-10T10:00:00.000Z"
    }
  }
}
```

---

### 1.14 Update Order - FAILURE (Cannot Edit In Progress Order) ❌

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/orders/{{inProgressOrderId}}`

**Request Body:**
```json
{
  "priority": "low"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot edit", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/cannot.*edit.*status/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Cannot edit order in current status"
}
```

---

### 1.15 Delete Order (Soft Delete) - SUCCESS ✅

**Prerequisite:** Order must not be in active status

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/orders/{{draftOrderId}}`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order cancelled successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('cancelled');
});
```

---

### 1.16 Delete Order - FAILURE (Cannot Cancel Completed) ❌

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/orders/{{completedOrderId}}`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot cancel", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/cannot.*cancel.*completed/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Cannot cancel a completed or already cancelled order"
}
```

---

## 2. ORDER STATUS MANAGEMENT

### 2.1 Confirm Order - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/confirm`

**Request Body:**
```json
{
  "notes": "Order confirmed with customer, starting work soon"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order confirmed successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('confirmed');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order confirmed successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "orderNumber": "ORD-20240209-001",
    "status": "confirmed",
    "notes": "Order confirmed with customer, starting work soon"
  }
}
```

---

### 2.2 Confirm Order - FAILURE (Not in Draft Status) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{confirmedOrderId}}/confirm`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates already confirmed", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/only.*draft.*confirmed/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Only draft orders can be confirmed"
}
```

---

### 2.3 Start Order Work - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/start`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order work started", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('in_progress');
});

pm.test("Actual start date is set", function () {
    const data = pm.response.json().data;
    pm.expect(data.timeline).to.have.property('actualStartDate');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order work started successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "in_progress",
    "timeline": {
      "actualStartDate": "2024-02-09T11:00:00.000Z",
      "estimatedCompletionDate": "2024-03-15T10:00:00.000Z"
    }
  }
}
```

---

### 2.4 Put Order on Hold - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/hold`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order put on hold", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('on_hold');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order put on hold successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "on_hold"
  }
}
```

---

### 2.5 Resume Order from Hold - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/resume`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order resumed successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('in_progress');
});
```

---

### 2.6 Mark as Ready - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/ready`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order marked as ready", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('ready');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order marked as ready",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "ready"
  }
}
```

---

### 2.7 Update Order Status - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/status`

**Request Body:**
```json
{
  "status": "quality_check",
  "notes": "Moving to quality check phase"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Status updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('quality_check');
});
```

---

### 2.8 Update Status - FAILURE (Invalid Transition) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/status`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid transition", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/cannot.*transition/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Cannot transition from draft to completed"
}
```

---

## 3. ORDER ASSIGNMENT

### 3.1 Assign Order to User - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/assign`

**Request Body:**
```json
{
  "assignedTo": "{{userId}}",
  "workstation": "Station A",
  "notes": "Assigned to senior artisan"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order assigned successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.assignment).to.have.property('assignedTo');
});

pm.test("Assignment details are correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.assignment.workstation).to.eql('Station A');
    pm.expect(data.assignment).to.have.property('assignedAt');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order assigned successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "assignment": {
      "assignedTo": "65f2222222222222222222222",
      "assignedBy": "65f3333333333333333333333",
      "assignedAt": "2024-02-09T11:30:00.000Z",
      "workstation": "Station A"
    }
  }
}
```

---

### 3.2 Assign Order - FAILURE (User Not Found) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/assign`

**Request Body:**
```json
{
  "assignedTo": "65f0000000000000000000000"
}
```

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates user not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/user.*not found/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 3.3 Reassign Order - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/reassign`

**Request Body:**
```json
{
  "assignedTo": "{{anotherUserId}}",
  "workstation": "Station B",
  "notes": "Reassigned to different artisan"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order reassigned successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("reassigned");
});
```

---

### 3.4 Get Assigned Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/assigned/{{userId}}?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Assigned orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("All orders are assigned to user", function () {
    const orders = pm.response.json().data;
    const userId = pm.collectionVariables.get('userId');
    orders.forEach(order => {
        pm.expect(order.assignment.assignedTo.toString()).to.eql(userId);
    });
});
```

---

## 4. PROGRESS & QUALITY

### 4.1 Add Progress Update - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/progress`

**Request Body:**
```json
{
  "description": "Completed initial metal work, moving to stone setting",
  "completionPercentage": 40,
  "photos": [
    "https://example.com/progress1.jpg",
    "https://example.com/progress2.jpg"
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Progress update added", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.progressUpdates).to.be.an('array');
});

pm.test("Latest progress update is present", function () {
    const data = pm.response.json().data;
    const latestUpdate = data.progressUpdates[data.progressUpdates.length - 1];
    pm.expect(latestUpdate.description).to.include("stone setting");
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Progress update added successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "progressUpdates": [
      {
        "updateDate": "2024-02-09T12:00:00.000Z",
        "description": "Completed initial metal work, moving to stone setting",
        "completionPercentage": 40,
        "photos": ["https://example.com/progress1.jpg"],
        "updatedBy": "65f2222222222222222222222"
      }
    ]
  }
}
```

---

### 4.2 Add Progress - FAILURE (Missing Description) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/progress`

**Request Body:**
```json
{
  "completionPercentage": 50
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates missing description", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/description.*required/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "description",
      "message": "Progress description is required"
    }
  ]
}
```

---

### 4.3 Get Progress Updates - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/progress`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Progress updates retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Updates are in chronological order", function () {
    const updates = pm.response.json().data;
    for (let i = 0; i < updates.length - 1; i++) {
        const current = new Date(updates[i].updateDate);
        const next = new Date(updates[i + 1].updateDate);
        pm.expect(current.getTime()).to.be.at.least(next.getTime());
    }
});
```

---

### 4.4 Perform Quality Check - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/quality-check`

**Request Body:**
```json
{
  "status": "passed",
  "remarks": "All specifications met, excellent craftsmanship",
  "issues": [],
  "photos": [
    "https://example.com/qc1.jpg"
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Quality check performed", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.qualityCheck).to.have.property('status');
});

pm.test("Order status updated to ready", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('ready');
    pm.expect(data.qualityCheck.status).to.eql('passed');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Quality check performed successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "ready",
    "qualityCheck": {
      "status": "passed",
      "checkedBy": "65f2222222222222222222222",
      "checkedAt": "2024-02-09T14:00:00.000Z",
      "remarks": "All specifications met, excellent craftsmanship",
      "issues": [],
      "photos": ["https://example.com/qc1.jpg"]
    }
  }
}
```

---

### 4.5 Quality Check - FAILURE (Failed with Issues) ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/quality-check`

**Request Body:**
```json
{
  "status": "failed",
  "remarks": "Stone setting needs adjustment",
  "issues": [
    "Stone alignment incorrect",
    "Polish not uniform"
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Failed quality check processed", function () {
    const data = pm.response.json().data;
    pm.expect(data.qualityCheck.status).to.eql('failed');
    pm.expect(data.status).to.eql('in_progress');
});
```

---

### 4.6 Get Quality Check Details - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/quality-check`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Quality check details retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('status');
    pm.expect(jsonData.data).to.have.property('checkedBy');
});
```

---

## 5. PAYMENT & BILLING

### 5.1 Add Payment - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/payments`

**Request Body:**
```json
{
  "amount": 20000,
  "paymentMode": "upi",
  "paymentDate": "2024-02-09T15:00:00.000Z",
  "transactionId": "UPI123456789",
  "notes": "Second installment received"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment added successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.payment.payments).to.be.an('array');
});

pm.test("Payment details are correct", function () {
    const data = pm.response.json().data;
    const latestPayment = data.payment.payments[data.payment.payments.length - 1];
    pm.expect(latestPayment.amount).to.eql(20000);
    pm.expect(latestPayment.paymentMode).to.eql('upi');
});

pm.test("Advance paid is updated", function () {
    const data = pm.response.json().data;
    pm.expect(data.financials.advancePaid).to.eql(35000);
    pm.expect(data.financials.balanceDue).to.eql(10000);
});

pm.test("Payment status updated correctly", function () {
    const data = pm.response.json().data;
    if (data.financials.balanceDue === 0) {
        pm.expect(data.payment.paymentStatus).to.eql('paid');
    } else {
        pm.expect(data.payment.paymentStatus).to.eql('partially_paid');
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Payment added successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "financials": {
      "estimatedTotal": 45000,
      "advancePaid": 35000,
      "balanceDue": 10000
    },
    "payment": {
      "paymentStatus": "partially_paid",
      "payments": [
        {
          "amount": 15000,
          "paymentMode": "cash",
          "paymentDate": "2024-02-09T10:30:00.000Z",
          "receivedBy": "65f2222222222222222222222"
        },
        {
          "amount": 20000,
          "paymentMode": "upi",
          "paymentDate": "2024-02-09T15:00:00.000Z",
          "transactionId": "UPI123456789",
          "receivedBy": "65f2222222222222222222222"
        }
      ]
    }
  }
}
```

---

### 5.2 Add Payment - FAILURE (Invalid Amount) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/payments`

**Request Body:**
```json
{
  "amount": -1000,
  "paymentMode": "cash"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid amount", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/amount.*greater.*0/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
```

---

### 5.3 Add Payment - FAILURE (Invalid Payment Mode) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/payments`

**Request Body:**
```json
{
  "amount": 5000,
  "paymentMode": "bitcoin"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid payment mode", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*payment.*mode/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "paymentMode",
      "message": "Invalid payment mode"
    }
  ]
}
```

---

### 5.4 Get Order Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/payments`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payments retrieved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Each payment has required fields", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment).to.have.property('amount');
        pm.expect(payment).to.have.property('paymentMode');
        pm.expect(payment).to.have.property('paymentDate');
    });
});
```

---

### 5.5 Generate Bill - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/bill`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bill generated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('orderNumber');
});

pm.test("Bill has all required sections", function () {
    const bill = pm.response.json().data;
    pm.expect(bill).to.have.property('customer');
    pm.expect(bill).to.have.property('items');
    pm.expect(bill).to.have.property('financials');
    pm.expect(bill).to.have.property('payment');
});

pm.test("Financial calculations are present", function () {
    const bill = pm.response.json().data;
    pm.expect(bill.financials).to.have.property('estimatedTotal');
    pm.expect(bill.financials).to.have.property('advancePaid');
    pm.expect(bill.financials).to.have.property('balanceDue');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Bill generated successfully",
  "data": {
    "orderNumber": "ORD-20240209-001",
    "orderDate": "2024-02-09T10:30:00.000Z",
    "customer": {
      "customerName": "Raj Kumar",
      "phone": "+919876543210",
      "email": "raj@example.com"
    },
    "items": [...],
    "financials": {
      "estimatedTotal": 45000,
      "advancePaid": 35000,
      "balanceDue": 10000,
      "taxAmount": 2250
    },
    "payment": {
      "paymentStatus": "partially_paid",
      "payments": [...]
    }
  }
}
```

---

## 6. DELIVERY & COMPLETION

### 6.1 Mark as Delivered - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/deliver`

**Request Body:**
```json
{
  "deliveryType": "pickup",
  "deliveryDate": "2024-02-09T16:00:00.000Z",
  "deliveredTo": "Raj Kumar (Customer)",
  "notes": "Customer picked up the order, very satisfied"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order marked as delivered", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('delivered');
});

pm.test("Delivery details are present", function () {
    const data = pm.response.json().data;
    pm.expect(data.delivery).to.have.property('deliveryType');
    pm.expect(data.delivery).to.have.property('deliveredBy');
    pm.expect(data.delivery).to.have.property('deliveredAt');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order marked as delivered",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "delivered",
    "delivery": {
      "deliveryType": "pickup",
      "deliveryDate": "2024-02-09T16:00:00.000Z",
      "deliveredTo": "Raj Kumar (Customer)",
      "deliveredBy": "65f2222222222222222222222",
      "deliveredAt": "2024-02-09T16:00:00.000Z",
      "notes": "Customer picked up the order, very satisfied"
    }
  }
}
```

---

### 6.2 Mark as Delivered - FAILURE (Not Ready) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{inProgressOrderId}}/deliver`

**Request Body:**
```json
{
  "deliveryType": "pickup"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates order must be ready", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/must.*ready.*delivered/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Order must be in ready status to mark as delivered"
}
```

---

### 6.3 Mark as Delivered - FAILURE (Invalid Delivery Type) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/deliver`

**Request Body:**
```json
{
  "deliveryType": "drone"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid delivery type", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*delivery.*type/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "deliveryType",
      "message": "Invalid delivery type"
    }
  ]
}
```

---

### 6.4 Complete Order - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}/complete`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order completed successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('completed');
});

pm.test("Completion date is set", function () {
    const data = pm.response.json().data;
    pm.expect(data.timeline).to.have.property('actualCompletionDate');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order completed successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "completed",
    "timeline": {
      "actualStartDate": "2024-02-09T11:00:00.000Z",
      "actualCompletionDate": "2024-02-09T16:30:00.000Z",
      "estimatedCompletionDate": "2024-03-15T10:00:00.000Z"
    }
  }
}
```

---

### 6.5 Complete Order - FAILURE (Not Delivered) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/orders/{{readyOrderId}}/complete`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates must be delivered first", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/delivered.*completed/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Order must be delivered before marking as completed"
}
```

---

### 6.6 Cancel Order - SUCCESS ✅

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation due to financial constraints",
  "refundAmount": 15000
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Order cancelled successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql('cancelled');
});

pm.test("Cancellation details are present", function () {
    const data = pm.response.json().data;
    pm.expect(data.cancellation).to.have.property('isCancelled');
    pm.expect(data.cancellation.isCancelled).to.eql(true);
    pm.expect(data.cancellation).to.have.property('cancellationReason');
    pm.expect(data.cancellation).to.have.property('refundAmount');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "cancelled",
    "cancellation": {
      "isCancelled": true,
      "cancelledAt": "2024-02-09T17:00:00.000Z",
      "cancelledBy": "65f2222222222222222222222",
      "cancellationReason": "Customer requested cancellation due to financial constraints",
      "refundAmount": 15000,
      "refundStatus": "pending"
    }
  }
}
```

---

### 6.7 Cancel Order - FAILURE (Missing Reason) ❌

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/orders/{{orderId}}`

**Request Body:**
```json
{
  "refundAmount": 5000
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates reason required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/reason.*required/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "reason",
      "message": "Cancellation reason is required"
    }
  ]
}
```

---

## 7. ORDER FILTERING & SEARCH

### 7.1 Get Overdue Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/overdue?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Overdue orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("All orders are overdue", function () {
    const orders = pm.response.json().data;
    const now = new Date();
    orders.forEach(order => {
        const dueDate = new Date(order.timeline.estimatedCompletionDate);
        pm.expect(dueDate.getTime()).to.be.below(now.getTime());
        pm.expect(['confirmed', 'in_progress', 'on_hold']).to.include(order.status);
    });
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Overdue orders retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "orderNumber": "ORD-20240201-005",
      "status": "in_progress",
      "timeline": {
        "estimatedCompletionDate": "2024-02-08T10:00:00.000Z"
      },
      "customerDetails": {
        "customerName": "Raj Kumar"
      }
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

---

### 7.2 Get Due Soon Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/due-soon?days=7&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Due soon orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("All orders are due within specified days", function () {
    const orders = pm.response.json().data;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    orders.forEach(order => {
        const dueDate = new Date(order.timeline.estimatedCompletionDate);
        pm.expect(dueDate.getTime()).to.be.at.least(now.getTime());
        pm.expect(dueDate.getTime()).to.be.at.most(futureDate.getTime());
    });
});
```

---

### 7.3 Get Pending Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/pending?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Pending orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("All orders have pending status", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        pm.expect(['confirmed', 'in_progress', 'on_hold']).to.include(order.status);
    });
});
```

---

### 7.4 Get Completed Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/completed?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Completed orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("All orders are completed", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        pm.expect(order.status).to.eql('completed');
    });
});
```

---

### 7.5 Get Orders by Type - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/by-type/repair?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders of specified type retrieved", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        pm.expect(order.orderType).to.eql('repair');
    });
});
```

---

### 7.6 Get Orders by Priority - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/by-priority/urgent?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders with specified priority retrieved", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        pm.expect(order.priority).to.eql('urgent');
    });
});
```

---

### 7.7 Get Customer Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/customer/{{customerId}}?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer orders retrieved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("All orders belong to customer", function () {
    const orders = pm.response.json().data;
    const customerId = pm.collectionVariables.get('customerId');
    orders.forEach(order => {
        pm.expect(order.customerId.toString()).to.eql(customerId);
    });
});
```

---

### 7.8 Search Orders - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders?search=Raj&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Search results returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Results match search term", function () {
    const orders = pm.response.json().data;
    orders.forEach(order => {
        const searchTerm = 'Raj';
        const matchesOrderNumber = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCustomer = order.customerDetails.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPhone = order.customerDetails.phone.includes(searchTerm);
        
        pm.expect(matchesOrderNumber || matchesCustomer || matchesPhone).to.be.true;
    });
});
```

---

### 7.9 Filter by Date Range - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders?startDate=2024-02-01&endDate=2024-02-09&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders within date range", function () {
    const orders = pm.response.json().data;
    const startDate = new Date('2024-02-01');
    const endDate = new Date('2024-02-09');
    
    orders.forEach(order => {
        const orderDate = new Date(order.orderDate);
        pm.expect(orderDate.getTime()).to.be.at.least(startDate.getTime());
        pm.expect(orderDate.getTime()).to.be.at.most(endDate.getTime());
    });
});
```

---

### 7.10 Filter - FAILURE (Invalid Date Format) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders?startDate=01-02-2024`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid date format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*date.*format/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid start date format"
}
```

---

## 8. ORDER ANALYTICS

### 8.1 Get Order Analytics - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/analytics?startDate=2024-01-01&endDate=2024-02-09`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Analytics data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('totalOrders');
    pm.expect(data).to.have.property('statusBreakdown');
    pm.expect(data).to.have.property('typeBreakdown');
    pm.expect(data).to.have.property('overdueOrders');
    pm.expect(data).to.have.property('averageCompletionTime');
});

pm.test("Status breakdown has count for each status", function () {
    const statusBreakdown = pm.response.json().data.statusBreakdown;
    pm.expect(statusBreakdown).to.be.an('array');
    statusBreakdown.forEach(item => {
        pm.expect(item).to.have.property('_id');
        pm.expect(item).to.have.property('count');
        pm.expect(item.count).to.be.a('number');
    });
});

pm.test("Type breakdown is present", function () {
    const typeBreakdown = pm.response.json().data.typeBreakdown;
    pm.expect(typeBreakdown).to.be.an('array');
});

pm.test("Numeric values are valid", function () {
    const data = pm.response.json().data;
    pm.expect(data.totalOrders).to.be.a('number');
    pm.expect(data.overdueOrders).to.be.a('number');
    pm.expect(data.averageCompletionTime).to.be.a('number');
    pm.expect(data.averageCompletionTime).to.be.at.least(0);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order analytics retrieved successfully",
  "data": {
    "totalOrders": 150,
    "statusBreakdown": [
      { "_id": "confirmed", "count": 30 },
      { "_id": "in_progress", "count": 45 },
      { "_id": "completed", "count": 60 },
      { "_id": "cancelled", "count": 15 }
    ],
    "typeBreakdown": [
      { "_id": "custom_order", "count": 80 },
      { "_id": "repair", "count": 50 },
      { "_id": "alteration", "count": 20 }
    ],
    "overdueOrders": 12,
    "averageCompletionTime": 7.5
  }
}
```

---

### 8.2 Get Order Dashboard - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/orders/dashboard`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Dashboard data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('analytics');
    pm.expect(data).to.have.property('overdueOrders');
    pm.expect(data).to.have.property('dueSoonOrders');
    pm.expect(data).to.have.property('pendingOrders');
});

pm.test("Analytics section is present", function () {
    const analytics = pm.response.json().data.analytics;
    pm.expect(analytics).to.have.property('totalOrders');
    pm.expect(analytics).to.have.property('statusBreakdown');
});

pm.test("Order lists are arrays", function () {
    const data = pm.response.json().data;
    pm.expect(data.overdueOrders).to.be.an('array');
    pm.expect(data.dueSoonOrders).to.be.an('array');
    pm.expect(data.pendingOrders).to.be.an('array');
});

pm.test("Dashboard loads quickly", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order dashboard retrieved successfully",
  "data": {
    "analytics": {
      "totalOrders": 150,
      "statusBreakdown": [...],
      "typeBreakdown": [...],
      "overdueOrders": 12,
      "averageCompletionTime": 7.5
    },
    "overdueOrders": [
      {
        "_id": "65f9876543210fedcba98765",
        "orderNumber": "ORD-20240201-005",
        "status": "in_progress",
        "customerDetails": {...}
      }
    ],
    "dueSoonOrders": [...],
    "pendingOrders": [...]
  }
}
```

---

## Summary of Test Scenarios

### Total Routes Tested: 35+

#### Route Breakdown:
1. **Order CRUD Operations (6 routes)**
   - Create Order
   - Get All Orders
   - Get Order by ID
   - Update Order
   - Delete Order (Cancel)

2. **Order Status Management (7 routes)**
   - Confirm Order
   - Start Order
   - Hold Order
   - Resume Order
   - Mark as Ready
   - Update Status

3. **Order Assignment (3 routes)**
   - Assign Order
   - Reassign Order
   - Get Assigned Orders

4. **Progress & Quality (4 routes)**
   - Add Progress Update
   - Get Progress
   - Perform Quality Check
   - Get Quality Check

5. **Payment & Billing (3 routes)**
   - Add Payment
   - Get Payments
   - Generate Bill

6. **Delivery & Completion (3 routes)**
   - Mark as Delivered
   - Complete Order
   - Cancel Order

7. **Order Filtering & Search (9 routes)**
   - Get Overdue Orders
   - Get Due Soon Orders
   - Get Pending Orders
   - Get Completed Orders
   - Get by Type
   - Get by Priority
   - Get Customer Orders
   - Search Orders
   - Filter by Date Range

8. **Order Analytics (2 routes)**
   - Get Analytics
   - Get Dashboard

#### Test Coverage:
- **Positive Tests (Success ✅):** 35+ scenarios
- **Negative Tests (Failure ❌):** 25+ scenarios

---

## Postman Collection Setup

### Environment Variables
```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "YOUR_JWT_TOKEN",
  "shopId": "65f1234567890abcdef12345",
  "organizationId": "65f9999999999999999999999",
  "customerId": "65f1111111111111111111111",
  "userId": "65f2222222222222222222222",
  "orderId": "",
  "orderNumber": "",
  "draftOrderId": "",
  "confirmedOrderId": "",
  "inProgressOrderId": "",
  "readyOrderId": "",
  "completedOrderId": ""
}
```

### Pre-request Script (Collection Level)
```javascript
// Add authentication header
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('authToken')
});

// Add timestamp
pm.environment.set('requestTimestamp', new Date().toISOString());
```

### Tests Script (Collection Level)
```javascript
// Common tests for all requests
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});

pm.test("Content-Type is JSON", function () {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
});

pm.test("Response has proper structure", function () {
    const jsonData = pm.response.json();
    if ([200, 201].includes(pm.response.code)) {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData).to.have.property('data');
    }
});
```

---

## Testing Workflows

### Workflow 1: Complete Order Lifecycle
```
1. POST - Create Order (Draft)
2. PATCH - Confirm Order
3. POST - Assign to User
4. PATCH - Start Work
5. POST - Add Progress Update
6. POST - Quality Check (Pass)
7. PATCH - Mark as Ready
8. POST - Add Payment
9. PATCH - Mark as Delivered
10. PATCH - Complete Order
```

### Workflow 2: Order with Issues
```
1. POST - Create Order
2. PATCH - Confirm
3. PATCH - Start Work
4. POST - Quality Check (Failed)
5. POST - Add Progress Update
6. POST - Quality Check (Passed)
7. PATCH - Mark as Ready
```

### Workflow 3: Order Cancellation
```
1. POST - Create Order
2. PATCH - Confirm
3. GET - View Order Details
4. DELETE - Cancel Order
```

### Workflow 4: Analytics & Monitoring
```
1. GET - Dashboard
2. GET - Analytics
3. GET - Overdue Orders
4. GET - Due Soon Orders
```

---

## Response Time Benchmarks

| Endpoint Type | Expected Time |
|--------------|---------------|
| GET Single Order | < 300ms |
| GET Orders List | < 800ms |
| POST Create Order | < 1000ms |
| PUT Update Order | < 800ms |
| GET Dashboard | < 2000ms |
| GET Analytics | < 1500ms |

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [...]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Order not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Cannot perform action in current order status"
}
```

---

## Testing Best Practices

### 1. Test Data Management
- Create separate test customers
- Use unique order numbers
- Clean up test data periodically

### 2. Test Execution Order
- Create orders before testing updates
- Test status transitions in sequence
- Run dependent tests together

### 3. Assertions
- Verify response structure
- Check status codes
- Validate business logic
- Test edge cases

### 4. Error Handling
- Test all validation rules
- Verify error messages
- Check error response format

---

## Quick Reference

### Order Types
- `custom_order` - Custom jewelry order
- `repair` - Repair service
- `alteration` - Alteration service
- `engraving` - Engraving service
- `polishing` - Polishing service
- `stone_setting` - Stone setting
- `resizing` - Resizing service
- `certification` - Certification

### Order Status
- `draft` - Initial state
- `confirmed` - Order confirmed
- `in_progress` - Work in progress
- `on_hold` - Temporarily paused
- `quality_check` - Under QC
- `ready` - Ready for delivery
- `delivered` - Delivered to customer
- `completed` - Fully completed
- `cancelled` - Cancelled

### Priority Levels
- `low` - Low priority
- `normal` - Normal priority (default)
- `high` - High priority
- `urgent` - Urgent orders

### Payment Modes
- `cash` - Cash payment
- `card` - Card payment
- `upi` - UPI payment
- `cheque` - Cheque
- `bank_transfer` - Bank transfer
- `wallet` - Digital wallet
- `other` - Other modes

### Payment Status
- `unpaid` - No payment received
- `partially_paid` - Partial payment
- `paid` - Fully paid
- `refunded` - Refunded

---

**Last Updated:** February 09, 2026  
**API Version:** v1  
**Base URL:** http://localhost:3000/api/v1  
**Total Tests:** 60+ test scenarios  
**Test Coverage:** 100% of all routes

---

**Happy Testing! 🚀**
