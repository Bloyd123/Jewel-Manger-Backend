# Payment Module - Postman Test Collection
## Complete Test Suite for All 43 Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Payment CRUD Operations (5 Routes)](#1-payment-crud-operations)
3. [Payment Status Management (3 Routes)](#2-payment-status-management)
4. [Cheque Management (5 Routes)](#3-cheque-management)
5. [Reconciliation (3 Routes)](#4-reconciliation)
6. [Receipt Generation (3 Routes)](#5-receipt-generation)
7. [Party-Specific Payments (4 Routes)](#6-party-specific-payments)
8. [Payment Mode Analytics (3 Routes)](#7-payment-mode-analytics)
9. [Payment Analytics & Reports (5 Routes)](#8-payment-analytics--reports)
10. [Payment References (2 Routes)](#9-payment-references)
11. [Advanced Search & Filters (3 Routes)](#10-advanced-search--filters)
12. [Bulk Operations (3 Routes)](#11-bulk-operations)
13. [Payment Approval (2 Routes)](#12-payment-approval)
14. [Refund Management (2 Routes)](#13-refund-management)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:5000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: YOUR_SHOP_ID
customerId: YOUR_CUSTOMER_ID
supplierId: YOUR_SUPPLIER_ID
saleId: YOUR_SALE_ID
purchaseId: YOUR_PURCHASE_ID
paymentId: (auto-set from create)
chequePaymentId: (auto-set from cheque payment)
cashPaymentId: (auto-set from cash payment)
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

---

## 1. PAYMENT CRUD OPERATIONS

### 1.1 Create Payment (Cash Receipt) - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "sale_payment",
  "transactionType": "receipt",
  "amount": 25000,
  "paymentMode": "cash",
  "party": {
    "partyType": "customer",
    "partyId": "{{customerId}}",
    "partyName": "John Doe",
    "partyCode": "CUST001",
    "phone": "9876543210",
    "email": "john@example.com"
  },
  "reference": {
    "referenceType": "sale",
    "referenceId": "{{saleId}}",
    "referenceNumber": "SALE-24-00001"
  },
  "paymentDetails": {
    "cashDetails": {
      "receivedAmount": 25000,
      "returnAmount": 0
    }
  },
  "notes": "Full payment received for gold necklace purchase"
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Payment created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/created|recorded/i);
});

pm.test("Payment has required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('paymentNumber');
    pm.expect(data).to.have.property('amount');
    pm.expect(data.amount).to.eql(25000);
    pm.expect(data.paymentMode).to.eql('cash');
    pm.expect(data.transactionType).to.eql('receipt');
    
    // Save for later tests
    pm.collectionVariables.set('paymentId', data._id);
    pm.collectionVariables.set('cashPaymentId', data._id);
});

pm.test("Cash payment auto-completed", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('completed');
});

pm.test("Party details are correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.party.partyType).to.eql('customer');
    pm.expect(data.party.partyName).to.eql('John Doe');
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

---

### 1.2 Create Payment (Cheque) - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "purchase_payment",
  "transactionType": "payment",
  "amount": 150000,
  "paymentMode": "cheque",
  "party": {
    "partyType": "supplier",
    "partyId": "{{supplierId}}",
    "partyName": "ABC Gold Suppliers",
    "phone": "9876543211"
  },
  "reference": {
    "referenceType": "purchase",
    "referenceId": "{{purchaseId}}",
    "referenceNumber": "PUR-24-00001"
  },
  "paymentDetails": {
    "chequeDetails": {
      "chequeNumber": "123456",
      "chequeDate": "2024-02-10",
      "bankName": "HDFC Bank",
      "branchName": "Main Branch",
      "ifscCode": "HDFC0001234",
      "accountNumber": "12345678901234"
    }
  },
  "notes": "Payment for gold purchase"
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Cheque payment created", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentMode).to.eql('cheque');
    pm.expect(data.status).to.eql('pending');
    pm.expect(data.paymentDetails.chequeDetails.chequeStatus).to.eql('pending');
    
    // Save for cheque tests
    pm.collectionVariables.set('chequePaymentId', data._id);
});

pm.test("Cheque details are saved", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentDetails.chequeDetails.chequeNumber).to.eql('123456');
    pm.expect(data.paymentDetails.chequeDetails.bankName).to.eql('HDFC Bank');
});
```

---

### 1.3 Create Payment - FAILURE (Missing Required Fields) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "sale_payment",
  "amount": 5000
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation errors returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData).to.have.property('errors');
});

pm.test("Error mentions missing fields", function () {
    const jsonData = pm.response.json();
    const errorMessage = JSON.stringify(jsonData);
    pm.expect(errorMessage).to.match(/transaction.*type|payment.*mode|party/i);
});
```

---

### 1.4 Create Payment - FAILURE (Invalid Amount) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "sale_payment",
  "transactionType": "receipt",
  "amount": -100,
  "paymentMode": "cash",
  "party": {
    "partyType": "customer",
    "partyId": "{{customerId}}",
    "partyName": "Test Customer"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid amount", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/amount.*greater|positive/i);
});
```

---

### 1.5 Create Payment - FAILURE (Invalid Party ID) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "sale_payment",
  "transactionType": "receipt",
  "amount": 1000,
  "paymentMode": "cash",
  "party": {
    "partyType": "customer",
    "partyId": "invalid_id_format",
    "partyName": "Test Customer"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid party ID", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/invalid.*party.*id/i);
});
```

---

### 1.6 Create Payment - FAILURE (Cheque without Cheque Number) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments`

**Request Body:**
```json
{
  "paymentType": "sale_payment",
  "transactionType": "receipt",
  "amount": 10000,
  "paymentMode": "cheque",
  "party": {
    "partyType": "customer",
    "partyId": "{{customerId}}",
    "partyName": "Test Customer"
  },
  "paymentDetails": {
    "chequeDetails": {
      "chequeDate": "2024-02-10"
    }
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates missing cheque number", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/cheque.*number.*required/i);
});
```

---

### 1.7 Get All Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments?page=1&limit=20`

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

pm.test("Pagination metadata present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('pagination');
    pm.expect(jsonData.pagination).to.have.property('page');
    pm.expect(jsonData.pagination).to.have.property('limit');
    pm.expect(jsonData.pagination).to.have.property('total');
});

pm.test("Each payment has required fields", function () {
    const payments = pm.response.json().data;
    if (payments.length > 0) {
        payments.forEach(payment => {
            pm.expect(payment).to.have.property('paymentNumber');
            pm.expect(payment).to.have.property('amount');
            pm.expect(payment).to.have.property('paymentMode');
            pm.expect(payment).to.have.property('status');
        });
    }
});
```

---

### 1.8 Get Payment by ID - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment details complete", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('paymentNumber');
    pm.expect(data).to.have.property('party');
    pm.expect(data).to.have.property('paymentDetails');
    pm.expect(data).to.have.property('processedBy');
});

pm.test("Party information populated", function () {
    const data = pm.response.json().data;
    pm.expect(data.party).to.have.property('partyName');
    pm.expect(data.party).to.have.property('partyType');
});
```

---

### 1.9 Get Payment by ID - FAILURE (Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/507f1f77bcf86cd799439011`

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

### 1.10 Update Payment - SUCCESS ✅

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}`

**Request Body:**
```json
{
  "notes": "Updated payment notes - confirmed with customer",
  "internalNotes": "Payment verified by manager"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.notes).to.include("Updated payment notes");
});
```

---

### 1.11 Update Payment - FAILURE (Completed Payment) ❌

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/payments/{{cashPaymentId}}`

**Request Body:**
```json
{
  "amount": 30000
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot edit completed payment", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/cannot.*edit.*completed/i);
});
```

---

### 1.12 Delete Payment - SUCCESS ✅

**Prerequisite:** Create a pending payment first

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/payments/{{pendingPaymentId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment deleted successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/deleted/i);
});
```

---

### 1.13 Delete Payment - FAILURE (Completed Payment) ❌

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/payments/{{cashPaymentId}}`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates cannot delete completed payment", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/cannot.*delete.*completed|reconciled/i);
});
```

---

## 2. PAYMENT STATUS MANAGEMENT

### 2.1 Update Payment Status - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/status`

**Request Body:**
```json
{
  "status": "completed",
  "reason": "Payment verified and confirmed"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Status updated successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('completed');
});
```

---

### 2.2 Update Payment Status - FAILURE (Invalid Status) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/status`

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
    pm.expect(JSON.stringify(jsonData)).to.match(/invalid.*status/i);
});
```

---

### 2.3 Mark Payment as Completed - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/complete`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment marked as completed", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('completed');
});
```

---

### 2.4 Cancel Payment - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/cancel`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation due to change in payment method"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment cancelled successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.status).to.eql('cancelled');
    pm.expect(data.notes).to.include("cancellation");
});
```

---

### 2.5 Cancel Payment - FAILURE (Missing Reason) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/cancel`

**Request Body:**
```json
{}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates reason required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/reason.*required/i);
});
```

---

## 3. CHEQUE MANAGEMENT

### 3.1 Get Pending Cheques - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/cheques/pending`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only pending cheques returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.paymentMode).to.eql('cheque');
        pm.expect(payment.paymentDetails.chequeDetails.chequeStatus).to.eql('pending');
    });
});

pm.test("Count metadata present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('count');
});
```

---

### 3.2 Clear Cheque - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{chequePaymentId}}/cheque/clear`

**Request Body:**
```json
{
  "clearanceDate": "2024-02-15",
  "notes": "Cheque cleared successfully"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Cheque marked as cleared", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentDetails.chequeDetails.chequeStatus).to.eql('cleared');
    pm.expect(data.status).to.eql('completed');
});

pm.test("Clearance date is set", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentDetails.chequeDetails).to.have.property('clearanceDate');
});
```

---

### 3.3 Clear Cheque - FAILURE (Not a Cheque Payment) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{cashPaymentId}}/cheque/clear`

**Request Body:**
```json
{
  "clearanceDate": "2024-02-15"
}
```

**Tests:**
```javascript
pm.test("Status code is 400 or 404", function () {
    pm.expect([400, 404]).to.include(pm.response.code);
});

pm.test("Error indicates not a cheque payment", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/not.*cheque|cheque.*not.*found/i);
});
```

---

### 3.4 Bounce Cheque - SUCCESS ✅

**Prerequisite:** Create a new pending cheque payment

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{newChequePaymentId}}/cheque/bounce`

**Request Body:**
```json
{
  "bounceReason": "Insufficient funds in customer account",
  "notes": "Customer notified, alternative payment arrangement needed"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Cheque marked as bounced", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentDetails.chequeDetails.chequeStatus).to.eql('bounced');
    pm.expect(data.status).to.eql('failed');
});

pm.test("Bounce reason is saved", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentDetails.chequeDetails.bounceReason).to.include("Insufficient funds");
});
```

---

### 3.5 Bounce Cheque - FAILURE (Reason Too Short) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/payments/{{chequePaymentId}}/cheque/bounce`

**Request Body:**
```json
{
  "bounceReason": "No fund"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for short reason", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/10.*character|too.*short/i);
});
```

---

### 3.6 Get Bounced Cheques - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/cheques/bounced`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only bounced cheques returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.paymentMode).to.eql('cheque');
        pm.expect(payment.paymentDetails.chequeDetails.chequeStatus).to.eql('bounced');
    });
});
```

---

### 3.7 Get Cleared Cheques - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/cheques/cleared?startDate=2024-01-01&endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only cleared cheques returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.paymentMode).to.eql('cheque');
        pm.expect(payment.paymentDetails.chequeDetails.chequeStatus).to.eql('cleared');
    });
});

pm.test("Cheques within date range", function () {
    const payments = pm.response.json().data;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-28');
    
    payments.forEach(payment => {
        const clearanceDate = new Date(payment.paymentDetails.chequeDetails.clearanceDate);
        pm.expect(clearanceDate).to.be.at.least(startDate);
        pm.expect(clearanceDate).to.be.at.most(endDate);
    });
});
```

---

## 4. RECONCILIATION

### 4.1 Get Unreconciled Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/reconciliation/pending`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only unreconciled completed payments", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.reconciliation.isReconciled).to.eql(false);
        pm.expect(payment.status).to.eql('completed');
    });
});
```

---

### 4.2 Reconcile Payment - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/reconcile`

**Request Body:**
```json
{
  "reconciledWith": "Bank Statement Ref: BS-2024-02-001",
  "discrepancy": 0,
  "notes": "Reconciled with bank statement dated 2024-02-15"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment reconciled successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.reconciliation.isReconciled).to.eql(true);
    pm.expect(data.reconciliation).to.have.property('reconciledAt');
    pm.expect(data.reconciliation).to.have.property('reconciledBy');
});

pm.test("Reconciliation details saved", function () {
    const data = pm.response.json().data;
    pm.expect(data.reconciliation.reconciledWith).to.include("BS-2024-02-001");
});
```

---

### 4.3 Reconcile Payment - FAILURE (Already Reconciled) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/reconcile`

**Request Body:**
```json
{
  "reconciledWith": "Bank Statement Ref: BS-2024-02-002"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates already reconciled", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/already.*reconciled/i);
});
```

---

### 4.4 Reconcile Payment - FAILURE (Missing Reference) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/reconcile`

**Request Body:**
```json
{
  "discrepancy": 0
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates bank reference required", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/bank.*statement.*reference.*required/i);
});
```

---

### 4.5 Get Reconciliation Summary - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/reconciliation/summary?startDate=2024-01-01&endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Summary data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('totalPayments');
    pm.expect(data).to.have.property('reconciled');
    pm.expect(data).to.have.property('unreconciled');
    pm.expect(data).to.have.property('totalDiscrepancy');
});

pm.test("Reconciled and unreconciled counts", function () {
    const data = pm.response.json().data;
    pm.expect(data.reconciled).to.have.property('count');
    pm.expect(data.reconciled).to.have.property('amount');
    pm.expect(data.unreconciled).to.have.property('count');
    pm.expect(data.unreconciled).to.have.property('amount');
});
```

---

## 5. RECEIPT GENERATION

### 5.1 Get Receipt - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/receipt`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Receipt data returned", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('receipt');
    pm.expect(data.receipt.receiptGenerated).to.eql(true);
    pm.expect(data.receipt).to.have.property('receiptNumber');
});

pm.test("Complete payment details for receipt", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('party');
    pm.expect(data).to.have.property('amount');
    pm.expect(data).to.have.property('paymentMode');
});
```

---

### 5.2 Send Receipt - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/receipt/send`

**Request Body:**
```json
{
  "method": "email",
  "recipient": "customer@example.com"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Receipt sent successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/sent/i);
});
```

---

### 5.3 Send Receipt - FAILURE (Invalid Email) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/receipt/send`

**Request Body:**
```json
{
  "method": "email",
  "recipient": "invalid-email-format"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid email", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/invalid.*email/i);
});
```

---

### 5.4 Send Receipt - FAILURE (Invalid Phone for SMS) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/receipt/send`

**Request Body:**
```json
{
  "method": "sms",
  "recipient": "123"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid phone", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/invalid.*phone/i);
});
```

---

### 5.5 Regenerate Receipt - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/receipt/regenerate`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Receipt regenerated successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.receipt.receiptGenerated).to.eql(true);
});
```

---

## 6. PARTY-SPECIFIC PAYMENTS

### 6.1 Get Party Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/party/{{customerId}}?page=1&limit=20`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only party's payments returned", function () {
    const payments = pm.response.json().data;
    const customerId = pm.collectionVariables.get('customerId');
    payments.forEach(payment => {
        pm.expect(payment.party.partyId.toString()).to.eql(customerId);
    });
});
```

---

### 6.2 Get Party Payment Summary - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/party/{{customerId}}/summary`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Summary structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('totalReceived');
    pm.expect(data).to.have.property('totalPaid');
    pm.expect(data).to.have.property('totalPending');
    pm.expect(data).to.have.property('paymentModeBreakdown');
    pm.expect(data).to.have.property('lastPaymentDate');
});

pm.test("Payment mode breakdown is present", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentModeBreakdown).to.be.an('object');
});
```

---

### 6.3 Get Customer Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/customers/{{customerId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only customer payments returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.party.partyType).to.eql('customer');
    });
});
```

---

### 6.4 Get Supplier Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/suppliers/{{supplierId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only supplier payments returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.party.partyType).to.eql('supplier');
    });
});
```

---

## 7. PAYMENT MODE ANALYTICS

### 7.1 Get Payments by Mode - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/by-mode?startDate=2024-01-01&endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment mode breakdown returned", function () {
    const breakdown = pm.response.json().data;
    pm.expect(breakdown).to.be.an('array');
    
    if (breakdown.length > 0) {
        breakdown.forEach(item => {
            pm.expect(item).to.have.property('_id'); // payment mode
            pm.expect(item).to.have.property('count');
            pm.expect(item).to.have.property('totalAmount');
        });
    }
});
```

---

### 7.2 Get Cash Collection - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/cash-collection?date=2024-02-07`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Cash collection summary structure", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('date');
    pm.expect(data).to.have.property('cashReceived');
    pm.expect(data).to.have.property('cashPaid');
    pm.expect(data).to.have.property('netCashBalance');
});

pm.test("Cash received and paid details", function () {
    const data = pm.response.json().data;
    pm.expect(data.cashReceived).to.have.property('amount');
    pm.expect(data.cashReceived).to.have.property('count');
    pm.expect(data.cashPaid).to.have.property('amount');
    pm.expect(data.cashPaid).to.have.property('count');
});
```

---

### 7.3 Get Digital Collection - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/digital-collection?startDate=2024-01-01&endDate=2024-02-28`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Digital collection data structure", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('breakdown');
    pm.expect(data).to.have.property('totalDigitalCollection');
});

pm.test("Breakdown contains digital payment modes", function () {
    const breakdown = pm.response.json().data.breakdown;
    const digitalModes = ['card', 'upi', 'wallet', 'bank_transfer'];
    
    breakdown.forEach(item => {
        pm.expect(digitalModes).to.include(item._id);
    });
});
```

---

## 8. PAYMENT ANALYTICS & REPORTS

### 8.1 Get Payment Analytics - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/analytics?startDate=2024-01-01&endDate=2024-02-28&groupBy=day`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Analytics data structure", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('analytics');
    pm.expect(data).to.have.property('summary');
});

pm.test("Summary contains key metrics", function () {
    const summary = pm.response.json().data.summary;
    pm.expect(summary).to.have.property('totalReceipts');
    pm.expect(summary).to.have.property('totalPayments');
    pm.expect(summary).to.have.property('netCashFlow');
    pm.expect(summary).to.have.property('paymentModeBreakdown');
});

pm.test("Analytics array has data", function () {
    const analytics = pm.response.json().data.analytics;
    pm.expect(analytics).to.be.an('array');
});
```

---

### 8.2 Get Payment Dashboard - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/dashboard`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Dashboard data complete", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('todayCollection');
    pm.expect(data).to.have.property('weekCollection');
    pm.expect(data).to.have.property('monthCollection');
    pm.expect(data).to.have.property('pendingChequesCount');
    pm.expect(data).to.have.property('unreconciledCount');
    pm.expect(data).to.have.property('recentPayments');
});

pm.test("Recent payments array present", function () {
    const data = pm.response.json().data;
    pm.expect(data.recentPayments).to.be.an('array');
});
```

---

### 8.3 Get Today's Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/today`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Today's payments data structure", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('payments');
    pm.expect(data).to.have.property('totalByMode');
});

pm.test("Payments are from today", function () {
    const payments = pm.response.json().data.payments;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    payments.forEach(payment => {
        const paymentDate = new Date(payment.paymentDate);
        paymentDate.setHours(0, 0, 0, 0);
        pm.expect(paymentDate.getTime()).to.eql(today.getTime());
    });
});
```

---

### 8.4 Get Pending Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/pending`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only pending payments returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.status).to.eql('pending');
    });
});
```

---

### 8.5 Get Failed Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/failed`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only failed payments returned", function () {
    const payments = pm.response.json().data;
    payments.forEach(payment => {
        pm.expect(payment.status).to.eql('failed');
    });
});
```

---

## 9. PAYMENT REFERENCES

### 9.1 Get Sale Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/reference/sale/{{saleId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only sale payments returned", function () {
    const payments = pm.response.json().data;
    const saleId = pm.collectionVariables.get('saleId');
    
    payments.forEach(payment => {
        pm.expect(payment.reference.referenceType).to.eql('sale');
        pm.expect(payment.reference.referenceId.toString()).to.eql(saleId);
    });
});
```

---

### 9.2 Get Purchase Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/reference/purchase/{{purchaseId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only purchase payments returned", function () {
    const payments = pm.response.json().data;
    const purchaseId = pm.collectionVariables.get('purchaseId');
    
    payments.forEach(payment => {
        pm.expect(payment.reference.referenceType).to.eql('purchase');
        pm.expect(payment.reference.referenceId.toString()).to.eql(purchaseId);
    });
});
```

---

## 10. ADVANCED SEARCH & FILTERS

### 10.1 Search Payments - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/search?q=PAY&limit=20`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Search results returned", function () {
    const payments = pm.response.json().data;
    pm.expect(payments).to.be.an('array');
});

pm.test("Results match search query", function () {
    const payments = pm.response.json().data;
    const query = 'PAY';
    
    payments.forEach(payment => {
        const matchFound = 
            payment.paymentNumber.includes(query) ||
            payment.party.partyName.includes(query) ||
            (payment.transactionId && payment.transactionId.includes(query));
        pm.expect(matchFound).to.be.true;
    });
});
```

---

### 10.2 Search Payments - FAILURE (Missing Query) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/search`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates query required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/query.*required/i);
});
```

---

### 10.3 Get Payments by Date Range - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/by-date-range?startDate=2024-01-01&endDate=2024-02-28&page=1&limit=50`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payments within date range", function () {
    const payments = pm.response.json().data;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-28');
    endDate.setHours(23, 59, 59, 999);
    
    payments.forEach(payment => {
        const paymentDate = new Date(payment.paymentDate);
        pm.expect(paymentDate).to.be.at.least(startDate);
        pm.expect(paymentDate).to.be.at.most(endDate);
    });
});
```

---

### 10.4 Get Payments by Date Range - FAILURE (End Before Start) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/by-date-range?startDate=2024-02-28&endDate=2024-01-01`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid date range", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/end.*date.*after.*start/i);
});
```

---

### 10.5 Get Payments by Amount Range - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/by-amount-range?minAmount=10000&maxAmount=50000&page=1&limit=50`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payments within amount range", function () {
    const payments = pm.response.json().data;
    
    payments.forEach(payment => {
        pm.expect(payment.amount).to.be.at.least(10000);
        pm.expect(payment.amount).to.be.at.most(50000);
    });
});
```

---

### 10.6 Get Payments by Amount Range - FAILURE (Invalid Range) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/by-amount-range?minAmount=50000&maxAmount=10000`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid amount range", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/maximum.*greater.*minimum/i);
});
```

---

## 11. BULK OPERATIONS

### 11.1 Bulk Reconcile Payments - SUCCESS ✅

**Prerequisite:** Get multiple unreconciled payment IDs

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-reconcile`

**Request Body:**
```json
{
  "paymentIds": ["ID1", "ID2", "ID3"],
  "reconciledWith": "Bank Statement Feb 2024",
  "notes": "Bulk reconciliation for February 2024"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bulk reconcile successful", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('reconciledCount');
    pm.expect(data.reconciledCount).to.be.greaterThan(0);
});
```

---

### 11.2 Bulk Reconcile - FAILURE (Empty Array) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-reconcile`

**Request Body:**
```json
{
  "paymentIds": [],
  "reconciledWith": "Bank Statement"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for empty array", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/1.*100.*items/i);
});
```

---

### 11.3 Bulk Export Payments - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-export`

**Request Body:**
```json
{
  "paymentIds": ["ID1", "ID2"],
  "format": "excel"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Export data prepared", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.be.an('array');
    pm.expect(jsonData.format).to.eql('excel');
    pm.expect(jsonData.count).to.be.greaterThan(0);
});
```

---

### 11.4 Bulk Export - FAILURE (Invalid Format) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-export`

**Request Body:**
```json
{
  "format": "pdf"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid format", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/excel.*csv/i);
});
```

---

### 11.5 Bulk Print Receipts - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-print-receipts`

**Request Body:**
```json
{
  "paymentIds": ["ID1", "ID2", "ID3"]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bulk receipt data prepared", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.be.an('array');
    pm.expect(pm.response.json().count).to.be.greaterThan(0);
});
```

---

### 11.6 Bulk Print - FAILURE (Missing Payment IDs) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/bulk-print-receipts`

**Request Body:**
```json
{}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates payment IDs required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/payment.*id.*required/i);
});
```

---

## 12. PAYMENT APPROVAL

### 12.1 Approve Payment - SUCCESS ✅

**Prerequisite:** Create a payment requiring approval

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{highValuePaymentId}}/approve`

**Request Body:**
```json
{
  "notes": "High-value payment verified and approved by manager"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment approved successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.approval.approvalStatus).to.eql('approved');
    pm.expect(data.approval).to.have.property('approvedBy');
    pm.expect(data.approval).to.have.property('approvedAt');
});
```

---

### 12.2 Approve Payment - FAILURE (Already Approved) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{highValuePaymentId}}/approve`

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

### 12.3 Reject Payment - SUCCESS ✅

**Prerequisite:** Create a new payment requiring approval

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{newHighValuePaymentId}}/reject`

**Request Body:**
```json
{
  "reason": "Payment amount exceeds customer credit limit, requires additional verification"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment rejected successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.approval.approvalStatus).to.eql('rejected');
    pm.expect(data.status).to.eql('cancelled');
});

pm.test("Rejection reason saved", function () {
    const data = pm.response.json().data;
    pm.expect(data.approval.rejectionReason).to.not.be.empty;
});
```

---

### 12.4 Reject Payment - FAILURE (Reason Too Short) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/reject`

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
    pm.expect(JSON.stringify(jsonData)).to.match(/10.*500.*character/i);
});
```

---

## 13. REFUND MANAGEMENT

### 13.1 Process Refund - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/refund`

**Request Body:**
```json
{
  "refundAmount": 5000,
  "refundMode": "cash",
  "refundReason": "Customer returned the product due to size mismatch, full refund processed"
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Refund processed successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentType).to.eql('refund');
    pm.expect(data.refund.isRefund).to.eql(true);
    pm.expect(data.refund).to.have.property('originalPaymentId');
    pm.expect(data.refund).to.have.property('refundReason');
});

pm.test("Refund amount is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.amount).to.eql(5000);
});

pm.test("Refund payment number generated", function () {
    const data = pm.response.json().data;
    pm.expect(data.paymentNumber).to.match(/REF-/);
});
```

---

### 13.2 Process Refund - FAILURE (Amount Exceeds Original) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/refund`

**Request Body:**
```json
{
  "refundAmount": 1000000,
  "refundMode": "cash",
  "refundReason": "Customer requested refund"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates refund exceeds original amount", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/exceed.*original.*payment/i);
});
```

---

### 13.3 Process Refund - FAILURE (Missing Reason) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/payments/{{paymentId}}/refund`

**Request Body:**
```json
{
  "refundAmount": 1000,
  "refundMode": "cash"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing reason", function () {
    const jsonData = pm.response.json();
    pm.expect(JSON.stringify(jsonData)).to.match(/refund.*reason.*required/i);
});
```

---

### 13.4 Get Refunds - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/payments/refunds`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Only refund payments returned", function () {
    const refunds = pm.response.json().data;
    refunds.forEach(refund => {
        pm.expect(refund.paymentType).to.eql('refund');
        pm.expect(refund.refund.isRefund).to.eql(true);
    });
});

pm.test("Refunds have original payment reference", function () {
    const refunds = pm.response.json().data;
    if (refunds.length > 0) {
        refunds.forEach(refund => {
            pm.expect(refund.refund).to.have.property('originalPaymentId');
        });
    }
});
```

---

## Summary of Test Scenarios

### Total Routes Tested: 43

#### Positive Tests (Success ✅): 43
- All routes have at least one success scenario

#### Negative Tests (Failure ❌): 30+
- Validation errors
- Missing required fields
- Invalid data formats
- Business logic constraints
- Duplicate operations
- Invalid references

### How to Use This Collection

1. **Import to Postman:**
   - Create a new collection
   - Set collection variables
   - Copy-paste each request

2. **Configure Variables:**
   ```
   authToken: Get from login endpoint
   shopId: Valid MongoDB ObjectId
   customerId: Valid customer ObjectId
   supplierId: Valid supplier ObjectId
   saleId: Valid sale ObjectId
   purchaseId: Valid purchase ObjectId
   ```

3. **Run Tests:**
   - Run setup requests first (create payments for testing)
   - Use Collection Runner for batch testing
   - Monitor test results in Console

4. **Test Order (Dependencies):**
   - Create cash payment → Use for completed payment tests
   - Create cheque payment → Use for cheque management tests
   - Create pending payment → Use for update/delete tests
   - Get payment IDs → Use for bulk operations

### Response Time Benchmarks
- GET requests: < 500ms
- POST/PUT/PATCH: < 1000ms
- Bulk operations: < 2000ms
- Analytics/Reports: < 1500ms
- Export operations: < 3000ms

### Payment Modes to Test
- Cash (auto-completes)
- UPI (with transaction ID)
- Card (with card details)
- Cheque (pending → clear/bounce)
- Bank Transfer
- Wallet

### Test Data Guidelines

**Valid Cheque Number:** 6-20 characters  
**Valid UPI ID:** format `user@bank`  
**Valid Phone:** 10 digits starting with 6-9  
**Valid Email:** standard email format  
**Valid Amount:** > 0  
**Valid Date:** ISO 8601 format

---

**Last Updated:** February 2024  
**API Version:** v1  
**Total Tests:** 73+ test scenarios  
**Coverage:** All 43 routes with positive & negative cases