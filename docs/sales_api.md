# Sales Management API - Complete Postman Test Collection
## Comprehensive Test Suite for All 42 Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Sale CRUD Operations (5 Routes)](#1-sale-crud-operations)
3. [Sale Status Management (5 Routes)](#2-sale-status-management)
4. [Payment Management (3 Routes)](#3-payment-management)
5. [Return & Exchange (2 Routes)](#4-return--exchange)
6. [Old Gold Exchange (2 Routes)](#5-old-gold-exchange)
7. [Customer-Specific Sales (2 Routes)](#6-customer-specific-sales)
8. [Sales Person Performance (2 Routes)](#7-sales-person-performance)
9. [Analytics & Reports (6 Routes)](#8-analytics--reports)
10. [Invoice Management (3 Routes)](#9-invoice-management)
11. [Discount & Offers (2 Routes)](#10-discount--offers)
12. [Bulk Operations (3 Routes)](#11-bulk-operations)
13. [Search & Filter (3 Routes)](#12-search--filter)
14. [Documents (2 Routes)](#13-documents)
15. [Approval (2 Routes)](#14-approval)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:3000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: 65f1234567890abcdef12345
organizationId: 65f9999999999999999999999
customerId: 65f4444444444444444444444
productId: 65f5555555555555555555555
userId: 65f6666666666666666666666
saleId: (auto-set from create)
invoiceNumber: (auto-set from create)
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

### Environment Setup
```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "shopId": "65f1234567890abcdef12345",
  "organizationId": "65f9999999999999999999999",
  "customerId": "65f4444444444444444444444",
  "productId": "65f5555555555555555555555",
  "userId": "65f6666666666666666666666"
}
```

---

## 1. SALE CRUD OPERATIONS

### Folder Structure in Postman:
```
📁 Sales Management API
  📁 1. Sale CRUD Operations
    📄 1.1 Create Sale - SUCCESS
    📄 1.2 Create Sale - FAIL (Missing Customer)
    📄 1.3 Create Sale - FAIL (Empty Items)
    📄 1.4 Create Sale - FAIL (Invalid Payment Mode)
    📄 1.5 Create Sale - FAIL (Insufficient Stock)
    📄 1.6 Get All Sales - SUCCESS
    📄 1.7 Get Sales with Filters - SUCCESS
    📄 1.8 Get Sales - FAIL (Invalid Page)
    📄 1.9 Get Single Sale - SUCCESS
    📄 1.10 Get Single Sale - FAIL (Invalid ID)
    📄 1.11 Get Single Sale - FAIL (Not Found)
    📄 1.12 Update Sale - SUCCESS
    📄 1.13 Update Sale - FAIL (Cannot Edit Confirmed)
    📄 1.14 Delete Sale - SUCCESS
    📄 1.15 Delete Sale - FAIL (Cannot Delete Confirmed)
```

---

### 1.1 Create Sale - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.1 Create Sale - SUCCESS`

**Method:** `POST`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "items": [
    {
      "productId": "{{productId}}",
      "productName": "Gold Ring 22K Traditional Design",
      "productCode": "GR-22K-001",
      "metalType": "gold",
      "purity": "22K",
      "quantity": 1,
      "grossWeight": 10.5,
      "stoneWeight": 0.5,
      "netWeight": 10.0,
      "ratePerGram": 6000,
      "makingCharges": 5000,
      "makingChargesType": "flat",
      "stoneCharges": 2000,
      "itemTotal": 67000,
      "hsnCode": "7113",
      "gstRate": 3
    }
  ],
  "saleType": "retail",
  "financials": {
    "subtotal": 67000,
    "totalDiscount": 1000,
    "totalGST": 1980,
    "grandTotal": 67980,
    "netPayable": 67980
  },
  "payment": {
    "paymentMode": "cash",
    "paidAmount": 67980,
    "dueAmount": 0,
    "paymentStatus": "paid"
  },
  "notes": "Customer preferred immediate delivery"
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Sale created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("created successfully");
});

pm.test("Sale has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('invoiceNumber');
    pm.expect(data).to.have.property('customerId');
    pm.expect(data).to.have.property('items');
    pm.expect(data).to.have.property('financials');
    pm.expect(data).to.have.property('payment');
    
    // Save sale ID and invoice number for later tests
    pm.collectionVariables.set('saleId', data._id);
    pm.collectionVariables.set('invoiceNumber', data.invoiceNumber);
});

pm.test("Invoice number is auto-generated", function () {
    const data = pm.response.json().data;
    pm.expect(data.invoiceNumber).to.match(/^INV-\d{4}-\d{2}-\d{3}$/);
});

pm.test("Customer details populated", function () {
    const data = pm.response.json().data;
    pm.expect(data.customerDetails).to.have.property('customerName');
    pm.expect(data.customerDetails).to.have.property('phone');
    pm.expect(data.customerDetails).to.have.property('email');
});

pm.test("Payment status is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.payment.paymentStatus).to.eql('paid');
    pm.expect(data.payment.dueAmount).to.eql(0);
});

pm.test("Sale status is confirmed", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('confirmed');
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "organizationId": "65f9999999999999999999999",
    "shopId": "65f1234567890abcdef12345",
    "invoiceNumber": "INV-2024-02-001",
    "customerId": "65f4444444444444444444444",
    "customerDetails": {
      "customerName": "John Doe",
      "customerCode": "CUST-001",
      "phone": "+919876543210",
      "email": "john@example.com",
      "address": "123 Main Street",
      "gstNumber": "29ABCDE1234F1Z5",
      "panNumber": "ABCDE1234F"
    },
    "items": [
      {
        "productId": "65f5555555555555555555555",
        "productName": "Gold Ring 22K Traditional Design",
        "productCode": "GR-22K-001",
        "metalType": "gold",
        "purity": "22K",
        "quantity": 1,
        "grossWeight": 10.5,
        "stoneWeight": 0.5,
        "netWeight": 10.0,
        "ratePerGram": 6000,
        "makingCharges": 5000,
        "makingChargesType": "flat",
        "stoneCharges": 2000,
        "itemTotal": 67000,
        "hsnCode": "7113",
        "gstRate": 3,
        "gstAmount": 2010
      }
    ],
    "saleType": "retail",
    "saleDate": "2024-02-09T05:30:00.000Z",
    "status": "confirmed",
    "financials": {
      "subtotal": 67000,
      "totalDiscount": 1000,
      "totalGST": 1980,
      "grandTotal": 67980,
      "netPayable": 67980,
      "oldGoldValue": 0
    },
    "payment": {
      "totalAmount": 67980,
      "paidAmount": 67980,
      "dueAmount": 0,
      "paymentStatus": "paid",
      "paymentMode": "cash",
      "payments": [
        {
          "amount": 67980,
          "paymentMode": "cash",
          "paymentDate": "2024-02-09T05:30:00.000Z",
          "receivedBy": "65f6666666666666666666666"
        }
      ]
    },
    "salesPerson": "65f6666666666666666666666",
    "createdBy": "65f6666666666666666666666",
    "createdAt": "2024-02-09T05:30:00.000Z",
    "updatedAt": "2024-02-09T05:30:00.000Z"
  }
}
```

---

### 1.2 Create Sale - FAIL (Missing Customer) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.2 Create Sale - FAIL (Missing Customer)`

**Method:** `POST`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales`

**Request Body:**
```json
{
  "items": [
    {
      "productName": "Gold Ring 22K",
      "metalType": "gold",
      "purity": "22K",
      "quantity": 1,
      "grossWeight": 10.5,
      "netWeight": 10.0,
      "ratePerGram": 6000,
      "itemTotal": 60000
    }
  ],
  "payment": {
    "paymentMode": "cash"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing customer ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData).to.have.property('errors');
    pm.expect(jsonData.errors).to.be.an('array');
});

pm.test("Error message indicates missing customer", function () {
    const jsonData = pm.response.json();
    const customerError = jsonData.errors.find(e => e.field === 'customerId');
    pm.expect(customerError).to.exist;
    pm.expect(customerError.message).to.include('required');
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "customerId",
      "message": "Customer ID is required",
      "value": undefined
    }
  ]
}
```

---

### 1.3 Create Sale - FAIL (Empty Items) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.3 Create Sale - FAIL (Empty Items)`

**Method:** `POST`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "items": [],
  "payment": {
    "paymentMode": "cash"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for empty items", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    const itemsError = jsonData.errors.find(e => e.field === 'items');
    pm.expect(itemsError).to.exist;
    pm.expect(itemsError.message).to.match(/at least one item/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "items",
      "message": "At least one item is required",
      "value": []
    }
  ]
}
```

---

### 1.4 Create Sale - FAIL (Invalid Payment Mode) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.4 Create Sale - FAIL (Invalid Payment Mode)`

**Method:** `POST`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "items": [
    {
      "productName": "Gold Ring",
      "metalType": "gold",
      "purity": "22K",
      "quantity": 1,
      "grossWeight": 10,
      "netWeight": 10,
      "ratePerGram": 6000,
      "itemTotal": 60000
    }
  ],
  "payment": {
    "paymentMode": "crypto"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid payment mode", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    const paymentError = jsonData.errors.find(e => e.field === 'payment.paymentMode');
    pm.expect(paymentError).to.exist;
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "payment.paymentMode",
      "message": "Invalid payment mode",
      "value": "crypto"
    }
  ]
}
```

---

### 1.5 Create Sale - FAIL (Insufficient Stock) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.5 Create Sale - FAIL (Insufficient Stock)`

**Method:** `POST`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "items": [
    {
      "productId": "{{productId}}",
      "productName": "Gold Ring",
      "metalType": "gold",
      "quantity": 100,
      "grossWeight": 10,
      "netWeight": 10,
      "ratePerGram": 6000,
      "itemTotal": 60000
    }
  ],
  "payment": {
    "paymentMode": "cash"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates insufficient stock", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.error).to.match(/insufficient.*stock/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Insufficient stock for Gold Ring. Available: 5",
  "statusCode": 400
}
```

---

### 1.6 Get All Sales - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.6 Get All Sales - SUCCESS`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales?page=1&limit=10&sort=-createdAt`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sales array returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Pagination metadata present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta.pagination).to.have.property('currentPage');
    pm.expect(jsonData.meta.pagination).to.have.property('totalPages');
    pm.expect(jsonData.meta.pagination).to.have.property('pageSize');
    pm.expect(jsonData.meta.pagination).to.have.property('totalItems');
});

pm.test("Sales have populated fields", function () {
    const sales = pm.response.json().data;
    if (sales.length > 0) {
        const sale = sales[0];
        pm.expect(sale).to.have.property('invoiceNumber');
        pm.expect(sale.customerId).to.be.an('object');
        pm.expect(sale.salesPerson).to.be.an('object');
    }
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sales fetched successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "invoiceNumber": "INV-2024-02-001",
      "customerId": {
        "_id": "65f4444444444444444444444",
        "firstName": "John",
        "lastName": "Doe",
        "customerCode": "CUST-001",
        "phone": "+919876543210"
      },
      "salesPerson": {
        "_id": "65f6666666666666666666666",
        "firstName": "Sales",
        "lastName": "Person",
        "email": "sales@example.com"
      },
      "saleDate": "2024-02-09T05:30:00.000Z",
      "status": "confirmed",
      "saleType": "retail",
      "financials": {
        "grandTotal": 67980,
        "netPayable": 67980
      },
      "payment": {
        "paymentStatus": "paid",
        "paidAmount": 67980,
        "dueAmount": 0
      }
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "pageSize": 10,
      "totalItems": 45
    }
  }
}
```

---

### 1.7 Get Sales with Filters - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.7 Get Sales with Filters - SUCCESS`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales?startDate=2024-02-01&endDate=2024-02-09&paymentStatus=paid&minAmount=10000&maxAmount=100000&status=confirmed&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Filtered sales returned", function () {
    const sales = pm.response.json().data;
    sales.forEach(sale => {
        pm.expect(sale.payment.paymentStatus).to.eql('paid');
        pm.expect(sale.status).to.eql('confirmed');
        pm.expect(sale.financials.grandTotal).to.be.at.least(10000);
        pm.expect(sale.financials.grandTotal).to.be.at.most(100000);
    });
});

pm.test("Sales within date range", function () {
    const sales = pm.response.json().data;
    const startDate = new Date('2024-02-01');
    const endDate = new Date('2024-02-09');
    
    sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate);
        pm.expect(saleDate).to.be.at.least(startDate);
        pm.expect(saleDate).to.be.at.most(endDate);
    });
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sales fetched successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "invoiceNumber": "INV-2024-02-001",
      "saleDate": "2024-02-09T05:30:00.000Z",
      "status": "confirmed",
      "financials": {
        "grandTotal": 67980
      },
      "payment": {
        "paymentStatus": "paid"
      }
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "pageSize": 10,
      "totalItems": 8
    }
  }
}
```

---

### 1.8 Get Sales - FAIL (Invalid Page) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.8 Get Sales - FAIL (Invalid Page)`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales?page=-1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for page number", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    const pageError = jsonData.errors.find(e => e.field === 'page');
    pm.expect(pageError).to.exist;
    pm.expect(pageError.message).to.match(/positive.*integer/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "page",
      "message": "Page must be a positive integer",
      "value": "-1"
    }
  ]
}
```

---

### 1.9 Get Single Sale - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.9 Get Single Sale - SUCCESS`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sale details returned", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('invoiceNumber');
    pm.expect(data).to.have.property('customerId');
    pm.expect(data).to.have.property('items');
    pm.expect(data).to.have.property('financials');
    pm.expect(data).to.have.property('payment');
});

pm.test("All related data is populated", function () {
    const data = pm.response.json().data;
    pm.expect(data.customerId).to.be.an('object');
    pm.expect(data.salesPerson).to.be.an('object');
    pm.expect(data.items[0].productId).to.be.an('object');
});

pm.test("Sale has complete financial details", function () {
    const data = pm.response.json().data;
    pm.expect(data.financials).to.have.property('subtotal');
    pm.expect(data.financials).to.have.property('grandTotal');
    pm.expect(data.payment).to.have.property('paymentStatus');
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale fetched successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "invoiceNumber": "INV-2024-02-001",
    "organizationId": "65f9999999999999999999999",
    "shopId": "65f1234567890abcdef12345",
    "customerId": {
      "_id": "65f4444444444444444444444",
      "firstName": "John",
      "lastName": "Doe",
      "customerCode": "CUST-001",
      "phone": "+919876543210",
      "email": "john@example.com",
      "address": {
        "street": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      }
    },
    "salesPerson": {
      "_id": "65f6666666666666666666666",
      "firstName": "Sales",
      "lastName": "Person",
      "email": "sales@example.com",
      "profileImage": "https://example.com/image.jpg"
    },
    "items": [
      {
        "productId": {
          "_id": "65f5555555555555555555555",
          "name": "Gold Ring 22K",
          "productCode": "GR-22K-001",
          "category": "Ring",
          "images": ["https://example.com/ring.jpg"]
        },
        "productName": "Gold Ring 22K Traditional Design",
        "productCode": "GR-22K-001",
        "metalType": "gold",
        "purity": "22K",
        "quantity": 1,
        "grossWeight": 10.5,
        "stoneWeight": 0.5,
        "netWeight": 10.0,
        "ratePerGram": 6000,
        "makingCharges": 5000,
        "stoneCharges": 2000,
        "itemTotal": 67000
      }
    ],
    "saleType": "retail",
    "saleDate": "2024-02-09T05:30:00.000Z",
    "status": "confirmed",
    "financials": {
      "subtotal": 67000,
      "totalDiscount": 1000,
      "totalGST": 1980,
      "grandTotal": 67980,
      "netPayable": 67980,
      "oldGoldValue": 0
    },
    "payment": {
      "totalAmount": 67980,
      "paidAmount": 67980,
      "dueAmount": 0,
      "paymentStatus": "paid",
      "paymentMode": "cash",
      "payments": [
        {
          "amount": 67980,
          "paymentMode": "cash",
          "paymentDate": "2024-02-09T05:30:00.000Z",
          "receivedBy": "65f6666666666666666666666"
        }
      ]
    },
    "notes": "Customer preferred immediate delivery",
    "createdAt": "2024-02-09T05:30:00.000Z",
    "updatedAt": "2024-02-09T05:30:00.000Z"
  }
}
```

---

### 1.10 Get Single Sale - FAIL (Invalid ID) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.10 Get Single Sale - FAIL (Invalid ID)`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/invalid_id`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid ID format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.error).to.match(/invalid.*id/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "saleId",
      "message": "Invalid ID format",
      "value": "invalid_id"
    }
  ]
}
```

---

### 1.11 Get Single Sale - FAIL (Not Found) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.11 Get Single Sale - FAIL (Not Found)`

**Method:** `GET`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/65c4f5e8a1234567890abc00`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates sale not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.error).to.match(/sale.*not.*found/i);
});
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Sale not found",
  "statusCode": 404
}
```

---

### 1.12 Update Sale - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.12 Update Sale - SUCCESS`

**Method:** `PUT`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}`

**Request Body:**
```json
{
  "items": [
    {
      "productId": "{{productId}}",
      "productName": "Gold Ring 22K Traditional Design",
      "productCode": "GR-22K-001",
      "metalType": "gold",
      "purity": "22K",
      "quantity": 2,
      "grossWeight": 21.0,
      "netWeight": 20.0,
      "ratePerGram": 6000,
      "makingCharges": 10000,
      "itemTotal": 130000
    }
  ],
  "financials": {
    "subtotal": 130000,
    "totalDiscount": 2000,
    "totalGST": 3840,
    "grandTotal": 131840,
    "netPayable": 131840
  },
  "notes": "Updated quantity to 2 as per customer request"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sale updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("updated successfully");
});

pm.test("Updated fields are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.items[0].quantity).to.eql(2);
    pm.expect(data.financials.grandTotal).to.eql(131840);
});

pm.test("Updated timestamp present", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('updatedBy');
    pm.expect(data).to.have.property('updatedAt');
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale updated successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "invoiceNumber": "INV-2024-02-001",
    "items": [
      {
        "quantity": 2,
        "grossWeight": 21.0,
        "netWeight": 20.0,
        "itemTotal": 130000
      }
    ],
    "financials": {
      "grandTotal": 131840
    },
    "updatedBy": "65f6666666666666666666666",
    "updatedAt": "2024-02-09T10:30:00.000Z"
  }
}
```

---

### 1.13 Update Sale - FAIL (Cannot Edit Confirmed) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.13 Update Sale - FAIL (Cannot Edit Confirmed)`

**Method:** `PUT`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}`

**Request Body:**
```json
{
  "items": [
    {
      "productName": "Gold Ring",
      "quantity": 3
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot edit confirmed sale", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.error).to.match(/can only edit.*draft.*pending/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Can only edit draft or pending sales",
  "statusCode": 400
}
```

---

### 1.14 Delete Sale - SUCCESS ✅

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.14 Delete Sale - SUCCESS`

**Method:** `DELETE`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}`

**Request Body:**
```json
{
  "reason": "Customer cancelled order before delivery"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sale deleted successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("cancelled successfully");
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale cancelled successfully"
}
```

---

### 1.15 Delete Sale - FAIL (Cannot Delete Confirmed) ❌

**Folder:** `1. Sale CRUD Operations`

**Request Name:** `1.15 Delete Sale - FAIL (Cannot Delete Confirmed)`

**Method:** `DELETE`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot delete confirmed sale", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.error).to.match(/can only delete.*draft/i);
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Can only delete draft sales",
  "statusCode": 400
}
```

---

## 2. SALE STATUS MANAGEMENT

### Folder Structure in Postman:
```
📁 2. Sale Status Management
  📄 2.1 Update Sale Status - SUCCESS
  📄 2.2 Update Status - FAIL (Invalid Status)
  📄 2.3 Confirm Sale - SUCCESS
  📄 2.4 Deliver Sale - SUCCESS
  📄 2.5 Deliver Sale - FAIL (Missing Delivery Type)
  📄 2.6 Complete Sale - SUCCESS
  📄 2.7 Cancel Sale - SUCCESS
  📄 2.8 Cancel Sale - FAIL (Reason Too Short)
  📄 2.9 Cancel Sale - FAIL (Already Cancelled)
```

---

### 2.1 Update Sale Status - SUCCESS ✅

**Folder:** `2. Sale Status Management`

**Request Name:** `2.1 Update Sale Status - SUCCESS`

**Method:** `PATCH`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}/status`

**Request Body:**
```json
{
  "status": "confirmed"
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
});

pm.test("New status is confirmed", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('confirmed');
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale status updated successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "confirmed",
    "updatedBy": "65f6666666666666666666666",
    "updatedAt": "2024-02-09T10:30:00.000Z"
  }
}
```

---

### 2.2 Update Status - FAIL (Invalid Status) ❌

**Folder:** `2. Sale Status Management`

**Request Name:** `2.2 Update Status - FAIL (Invalid Status)`

**Method:** `PATCH`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}/status`

**Request Body:**
```json
{
  "status": "invalid_status"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid status", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    const statusError = jsonData.errors.find(e => e.field === 'status');
    pm.expect(statusError).to.exist;
});
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "Invalid status",
      "value": "invalid_status"
    }
  ]
}
```

---

### 2.3 Confirm Sale - SUCCESS ✅

**Folder:** `2. Sale Status Management`

**Request Name:** `2.3 Confirm Sale - SUCCESS`

**Method:** `PATCH`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}/confirm`

**Request Body:**
```json
{
  "notes": "Sale confirmed after payment verification"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sale confirmed successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('confirmed');
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale confirmed successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "confirmed",
    "notes": "Sale confirmed after payment verification",
    "updatedAt": "2024-02-09T10:30:00.000Z"
  }
}
```

---

### 2.4 Deliver Sale - SUCCESS ✅

**Folder:** `2. Sale Status Management`

**Request Name:** `2.4 Deliver Sale - SUCCESS`

**Method:** `PATCH`

**Endpoint:** `{{baseUrl}}/shops/{{shopId}}/sales/{{saleId}}/deliver`

**Request Body:**
```json
{
  "deliveryType": "immediate",
  "deliveryAddress": "123 Main Street, Mumbai - 400001",
  "receivedBy": "John Doe",
  "deliveryNotes": "Delivered at customer's residence"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Sale marked as delivered", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('delivered');
    pm.expect(data.delivery).to.have.property('deliveryDate');
});
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Sale marked as delivered",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "status": "delivered",
    "delivery": {
      "deliveryType": "immediate",
      "deliveryAddress": "123 Main Street, Mumbai - 400001",
      "receivedBy": "John Doe",
      "deliveryDate": "2024-02-09T10:30:00.000Z",
      "deliveryNotes": "Delivered at customer's residence"
    }
  }
}
```

---

Due to length constraints, I'll continue with the remaining sections. Would you like me to:

1. **Continue with remaining sections** (3-14) in the same detailed format?
2. **Create separate files** for each major section?
3. **Provide a condensed version** with just the essential test cases?

The document follows the exact structure of your Product Management example with:
- ✅ Proper folder hierarchy
- ✅ Numbered request names
- ✅ Complete request/response examples
- ✅ Comprehensive test scripts
- ✅ Both success and failure scenarios

Let me know how you'd like me to proceed!
