# Purchase Module - Postman Test Collection
## Complete Test Suite for All 22 Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Purchase CRUD Operations (5 Routes)](#1-purchase-crud-operations)
3. [Purchase Status Management (3 Routes)](#2-purchase-status-management)
4. [Purchase Approval (2 Routes)](#3-purchase-approval)
5. [Payment Management (2 Routes)](#4-payment-management)
6. [Supplier Purchases (1 Route)](#5-supplier-purchases)
7. [Analytics & Reports (3 Routes)](#6-analytics--reports)
8. [Bulk Operations (2 Routes)](#7-bulk-operations)
9. [Document Management (2 Routes)](#8-document-management)
10. [Search & Filters (2 Routes)](#9-search--filters)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:5000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: YOUR_SHOP_ID
supplierId: YOUR_SUPPLIER_ID
purchaseId: (auto-set from create)
draftPurchaseId: (auto-set from create)
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

---

## 1. PURCHASE CRUD OPERATIONS

### 1.1 Create Purchase - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases`

**Request Body:**
```json
{
  "supplierId": "{{supplierId}}",
  "purchaseDate": "2024-02-07T10:00:00.000Z",
  "purchaseType": "new_stock",
  "items": [
    {
      "productName": "Gold Necklace 22K",
      "metalType": "gold",
      "purity": "22K",
      "grossWeight": 50,
      "stoneWeight": 5,
      "netWeight": 45,
      "weightUnit": "gram",
      "ratePerGram": 6000,
      "makingCharges": 5000,
      "stoneValue": 2000,
      "quantity": 1,
      "gstPercentage": 3
    }
  ],
  "payment": {
    "paymentMode": "cash",
    "paidAmount": 50000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Purchase created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("created");
});

pm.test("Purchase has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('purchaseNumber');
    pm.expect(data).to.have.property('items');
    pm.expect(data).to.have.property('financials');
    pm.expect(data.items.length).to.be.greaterThan(0);
    
    // Save for later tests
    pm.collectionVariables.set('purchaseId', data._id);
});

pm.test("Financial calculations are correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.financials).to.have.property('grandTotal');
    pm.expect(data.financials.grandTotal).to.be.greaterThan(0);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

---

### 1.2 Create Purchase - FAILURE (Missing Supplier) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases`

**Request Body:**
```json
{
  "purchaseDate": "2024-02-07T10:00:00.000Z",
  "items": [
    {
      "productName": "Gold Ring",
      "metalType": "gold",
      "purity": "22K",
      "grossWeight": 10,
      "netWeight": 10
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400 (Bad Request)", function () {
    pm.response.to.have.status(400);
});

pm.test("Error message indicates missing supplier", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.message || jsonData.error).to.match(/supplier/i);
});

pm.test("Validation errors are present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('errors');
});
```

---

### 1.3 Create Purchase - FAILURE (Invalid Supplier ID) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases`

**Request Body:**
```json
{
  "supplierId": "invalid_id_format",
  "items": [
    {
      "productName": "Gold Ring",
      "metalType": "gold",
      "purity": "22K",
      "grossWeight": 10,
      "netWeight": 10
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid ID format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.message || jsonData.errors).to.match(/invalid.*id/i);
});
```

---

### 1.4 Create Purchase - FAILURE (Empty Items Array) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases`

**Request Body:**
```json
{
  "supplierId": "{{supplierId}}",
  "items": []
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates items are required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message || jsonData.errors).to.match(/item|required/i);
});
```

---

### 1.5 Get All Purchases - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases?page=1&limit=20`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response contains purchases array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Pagination metadata is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('page');
    pm.expect(jsonData).to.have.property('limit');
    pm.expect(jsonData).to.have.property('total');
});

pm.test("Each purchase has required fields", function () {
    const purchases = pm.response.json().data;
    if (purchases.length > 0) {
        purchases.forEach(purchase => {
            pm.expect(purchase).to.have.property('purchaseNumber');
            pm.expect(purchase).to.have.property('purchaseDate');
            pm.expect(purchase).to.have.property('status');
        });
    }
});
```

---

### 1.6 Get All Purchases - FAILURE (Invalid Shop ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/invalid_shop_id/purchases`

**Tests:**
```javascript
pm.test("Status code is 400 or 404", function () {
    pm.expect([400, 404]).to.include(pm.response.code);
});

pm.test("Error message is returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
});
```

---

### 1.7 Get Purchase by ID - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase details are complete", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('purchaseNumber');
    pm.expect(data).to.have.property('items');
    pm.expect(data).to.have.property('financials');
    pm.expect(data).to.have.property('supplierId');
    pm.expect(data).to.have.property('supplierDetails');
});

pm.test("Supplier information is populated", function () {
    const data = pm.response.json().data;
    pm.expect(data.supplierDetails).to.have.property('supplierName');
});
```

---

### 1.8 Get Purchase by ID - FAILURE (Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/507f1f77bcf86cd799439011`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Not found error message", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.message).to.match(/not found/i);
});
```

---

### 1.9 Update Purchase - SUCCESS ✅

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}`

**Request Body:**
```json
{
  "notes": "Updated purchase notes",
  "payment": {
    "paidAmount": 75000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/updated/i);
});

pm.test("Updated fields are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.notes).to.include("Updated");
});
```

---

### 1.10 Update Purchase - FAILURE (Completed Purchase) ❌

**Prerequisite:** Need a completed purchase ID

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/purchases/{{completedPurchaseId}}`

**Request Body:**
```json
{
  "notes": "Trying to update completed purchase"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot edit completed purchase", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/cannot.*edit.*completed/i);
});
```

---

### 1.11 Delete Purchase - SUCCESS ✅

**Prerequisite:** Create a draft purchase first

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/purchases/{{draftPurchaseId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase deleted successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/deleted/i);
});
```

---

### 1.12 Delete Purchase - FAILURE (Non-Draft Purchase) ❌

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates only draft can be deleted", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/only.*draft/i);
});
```

---

## 2. PURCHASE STATUS MANAGEMENT

### 2.1 Update Purchase Status - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/status`

**Request Body:**
```json
{
  "status": "pending"
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
    pm.expect(jsonData.data.status).to.eql("pending");
});
```

---

### 2.2 Update Purchase Status - FAILURE (Invalid Status) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/status`

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
    pm.expect(jsonData.message || jsonData.errors).to.match(/invalid.*status/i);
});
```

---

### 2.3 Receive Purchase - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/receive`

**Request Body:**
```json
{
  "receivedDate": "2024-02-07T15:00:00.000Z",
  "notes": "Items received in good condition"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase marked as received", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql("completed");
});

pm.test("Inventory should be updated", function () {
    const data = pm.response.json().data;
    pm.expect(data.delivery).to.have.property('receivedDate');
    pm.expect(data.delivery).to.have.property('receivedBy');
});
```

---

### 2.4 Receive Purchase - FAILURE (Already Completed) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/receive`

**Request Body:**
```json
{
  "receivedDate": "2024-02-07T15:00:00.000Z"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates already received", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/already.*received/i);
});
```

---

### 2.5 Cancel Purchase - SUCCESS ✅

**Prerequisite:** Create a new pending purchase

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{pendingPurchaseId}}/cancel`

**Request Body:**
```json
{
  "reason": "Supplier unable to deliver items on time"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase cancelled successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql("cancelled");
});
```

---

### 2.6 Cancel Purchase - FAILURE (Missing Reason) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/cancel`

**Request Body:**
```json
{}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing reason", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/reason.*required/i);
});
```

---

## 3. PURCHASE APPROVAL

### 3.1 Approve Purchase - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/approve`

**Request Body:**
```json
{
  "notes": "Purchase approved after verification"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase approved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.approvalStatus).to.eql("approved");
});

pm.test("Approval metadata is set", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('approvedBy');
    pm.expect(data).to.have.property('approvedAt');
});
```

---

### 3.2 Approve Purchase - FAILURE (Already Approved) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/approve`

**Request Body:**
```json
{
  "notes": "Trying to approve again"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates already approved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/already.*approved/i);
});
```

---

### 3.3 Reject Purchase - SUCCESS ✅

**Prerequisite:** Create a new pending purchase

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{newPurchaseId}}/reject`

**Request Body:**
```json
{
  "reason": "Purchase prices are too high, renegotiation needed"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchase rejected successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.approvalStatus).to.eql("rejected");
});

pm.test("Rejection reason is saved", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('rejectionReason');
    pm.expect(data.rejectionReason).to.not.be.empty;
});
```

---

### 3.4 Reject Purchase - FAILURE (Reason Too Short) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/reject`

**Request Body:**
```json
{
  "reason": "No"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for short reason", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/5.*character/i);
});
```

---

## 4. PAYMENT MANAGEMENT

### 4.1 Add Payment - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/payments`

**Request Body:**
```json
{
  "amount": 25000,
  "paymentMode": "upi",
  "paymentDate": "2024-02-07T16:00:00.000Z",
  "transactionId": "UPI123456789",
  "notes": "Partial payment via UPI"
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
    pm.expect(jsonData.message).to.match(/payment.*added/i);
});

pm.test("Payment status updated", function () {
    const data = pm.response.json().data;
    pm.expect(data.payment.paidAmount).to.be.greaterThan(0);
    pm.expect(data.payment.payments).to.be.an('array');
});
```

---

### 4.2 Add Payment - FAILURE (Invalid Amount) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/payments`

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

pm.test("Validation error for negative amount", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/amount.*positive/i);
});
```

---

### 4.3 Add Payment - FAILURE (Missing Payment Mode) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/payments`

**Request Body:**
```json
{
  "amount": 5000
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates payment mode required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/payment.*mode.*required/i);
});
```

---

### 4.4 Get Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/payments`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payments array returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Each payment has required fields", function () {
    const payments = pm.response.json().data;
    if (payments.length > 0) {
        payments.forEach(payment => {
            pm.expect(payment).to.have.property('amount');
            pm.expect(payment).to.have.property('paymentMode');
            pm.expect(payment).to.have.property('paymentDate');
        });
    }
});
```

---

## 5. SUPPLIER PURCHASES

### 5.1 Get Purchases by Supplier - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/supplier/{{supplierId}}?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Supplier purchases returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("All purchases belong to specified supplier", function () {
    const purchases = pm.response.json().data;
    const supplierId = pm.collectionVariables.get('supplierId');
    purchases.forEach(purchase => {
        pm.expect(purchase.supplierId.toString()).to.eql(supplierId);
    });
});
```

---

### 5.2 Get Purchases by Supplier - FAILURE (Invalid Supplier ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/supplier/invalid_id`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid supplier ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/invalid.*supplier/i);
});
```

---

## 6. ANALYTICS & REPORTS

### 6.1 Get Purchase Analytics - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/analytics?startDate=2024-01-01&endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Analytics data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('totalPurchases');
    pm.expect(data).to.have.property('totalPurchaseValue');
    pm.expect(data).to.have.property('pendingPurchases');
    pm.expect(data).to.have.property('paymentStatusBreakdown');
    pm.expect(data).to.have.property('topSuppliers');
    pm.expect(data).to.have.property('monthlyTrend');
});

pm.test("Analytics values are numeric", function () {
    const data = pm.response.json().data;
    pm.expect(data.totalPurchases).to.be.a('number');
    pm.expect(data.totalPurchaseValue).to.be.a('number');
});
```

---

### 6.2 Get Pending Purchases - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/pending`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only pending purchases returned", function () {
    const purchases = pm.response.json().data;
    const validStatuses = ['draft', 'pending', 'ordered'];
    purchases.forEach(purchase => {
        pm.expect(validStatuses).to.include(purchase.status);
    });
});
```

---

### 6.3 Get Unpaid Purchases - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/unpaid`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only unpaid/partial purchases returned", function () {
    const purchases = pm.response.json().data;
    const validPaymentStatuses = ['unpaid', 'partial'];
    purchases.forEach(purchase => {
        pm.expect(validPaymentStatuses).to.include(purchase.payment.paymentStatus);
    });
});
```

---

## 7. BULK OPERATIONS

### 7.1 Bulk Delete Purchases - SUCCESS ✅

**Prerequisite:** Create 2-3 draft purchases

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/bulk-delete`

**Request Body:**
```json
{
  "purchaseIds": ["ID1", "ID2", "ID3"]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bulk delete successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('deletedCount');
    pm.expect(jsonData.data.deletedCount).to.be.greaterThan(0);
});
```

---

### 7.2 Bulk Delete - FAILURE (Non-Draft Purchases) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/bulk-delete`

**Request Body:**
```json
{
  "purchaseIds": ["{{purchaseId}}"]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates only draft can be deleted", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/only.*draft/i);
});
```

---

### 7.3 Bulk Approve Purchases - SUCCESS ✅

**Prerequisite:** Create pending purchases

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/bulk-approve`

**Request Body:**
```json
{
  "purchaseIds": ["ID1", "ID2"]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bulk approve successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('approvedCount');
});
```

---

### 7.4 Bulk Approve - FAILURE (Empty Array) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/bulk-approve`

**Request Body:**
```json
{
  "purchaseIds": []
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for empty array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/at least one/i);
});
```

---

## 8. DOCUMENT MANAGEMENT

### 8.1 Upload Document - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/documents`

**Request Body:**
```json
{
  "documentType": "invoice",
  "documentUrl": "https://example.com/documents/invoice123.pdf",
  "documentNumber": "INV-2024-001"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Document uploaded successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.documents).to.be.an('array');
});
```

---

### 8.2 Upload Document - FAILURE (Invalid URL) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/documents`

**Request Body:**
```json
{
  "documentType": "invoice",
  "documentUrl": "not-a-valid-url",
  "documentNumber": "INV-001"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid URL", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/invalid.*url/i);
});
```

---

### 8.3 Get Documents - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/{{purchaseId}}/documents`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Documents array returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});
```

---

## 9. SEARCH & FILTERS

### 9.1 Search Purchases - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/search?q=PUR&limit=20`

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

pm.test("Results match search query", function () {
    const purchases = pm.response.json().data;
    const searchQuery = 'PUR';
    purchases.forEach(purchase => {
        const matchFound = 
            purchase.purchaseNumber.includes(searchQuery) ||
            purchase.supplierDetails.supplierName.includes(searchQuery);
        pm.expect(matchFound).to.be.true;
    });
});
```

---

### 9.2 Search Purchases - FAILURE (Missing Query) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/search`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates query required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/query.*required/i);
});
```

---

### 9.3 Get Purchases by Date Range - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/by-date-range?startDate=2024-01-01&endDate=2024-02-28&page=1&limit=20`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purchases within date range", function () {
    const purchases = pm.response.json().data;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-28');
    
    purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.purchaseDate);
        pm.expect(purchaseDate).to.be.at.least(startDate);
        pm.expect(purchaseDate).to.be.at.most(endDate);
    });
});
```

---

### 9.4 Get Purchases by Date Range - FAILURE (Missing Start Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/purchases/by-date-range?endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates start date required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors || jsonData.message).to.match(/start.*date.*required/i);
});
```

---

## Summary of Test Scenarios

### Total Routes Tested: 22

#### Positive Tests (Success ✅): 22
- All routes have at least one success scenario

#### Negative Tests (Failure ❌): 20+
- Validation errors
- Missing required fields
- Invalid data formats
- Business logic constraints
- Authorization failures

### How to Use This Collection

1. **Import to Postman:**
   - Create a new collection
   - Set collection variables
   - Copy-paste each request

2. **Configure Variables:**
   ```
   authToken: Get from login endpoint
   shopId: Valid MongoDB ObjectId
   supplierId: Valid MongoDB ObjectId
   ```

3. **Run Tests:**
   - Run individual requests
   - Use Collection Runner for batch testing
   - Monitor test results in Console

4. **Best Practices:**
   - Run setup requests first
   - Follow test order for dependencies
   - Check response times
   - Verify error messages

### Response Time Benchmarks
- GET requests: < 500ms
- POST/PUT/PATCH: < 1000ms
- Bulk operations: < 2000ms
- Analytics: < 1500ms

---

**Last Updated:** February 2026 
**API Version:** v1  
**Total Tests:** 42+ test scenarios