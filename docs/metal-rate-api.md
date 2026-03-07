# Metal Rate Management API - Postman Test Collection
## Complete Test Suite for All 13 Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Rate CRUD Operations (5 Routes)](#1-rate-crud-operations)
3. [Rate Retrieval (4 Routes)](#2-rate-retrieval)
4. [Rate Analytics (2 Routes)](#3-rate-analytics)
5. [Organization Operations (2 Routes)](#4-organization-operations)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:3000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: 65f1234567890abcdef12345
organizationId: 65f9999999999999999999999
rateId: (auto-set from create)
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

---

## 1. RATE CRUD OPERATIONS

### 1.1 Create Today's Rate - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800,
      "sellingRate": 6850
    },
    "gold22K": {
      "buyingRate": 6200,
      "sellingRate": 6250
    },
    "gold18K": {
      "buyingRate": 5100,
      "sellingRate": 5150
    },
    "gold14K": {
      "buyingRate": 3950,
      "sellingRate": 4000
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 78,
      "sellingRate": 82
    },
    "sterling925": {
      "buyingRate": 72,
      "sellingRate": 76
    }
  },
  "platinum": {
    "buyingRate": 3200,
    "sellingRate": 3250
  },
  "weightUnit": "gram",
  "currency": "INR",
  "rateSource": "manual",
  "notes": "Regular market rates",
  "internalNotes": "Updated by admin",
  "marketReference": {
    "internationalGoldPrice": 2050.50,
    "internationalSilverPrice": 24.30,
    "exchangeRate": 83.25,
    "referenceSource": "MCX India"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 201 or 200", function () {
    pm.expect([200, 201]).to.include(pm.response.code);
});

pm.test("Rate created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/created|updated/i);
});

pm.test("Rate has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('shopId');
    pm.expect(data).to.have.property('rateDate');
    pm.expect(data).to.have.property('gold');
    pm.expect(data).to.have.property('isCurrent');
    
    // Save for later tests
    pm.collectionVariables.set('rateId', data._id);
});

pm.test("Gold rates structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data.gold).to.have.property('gold24K');
    pm.expect(data.gold.gold24K).to.have.property('buyingRate');
    pm.expect(data.gold.gold24K).to.have.property('sellingRate');
});

pm.test("Selling rate is greater than buying rate", function () {
    const data = pm.response.json().data;
    pm.expect(data.gold.gold24K.sellingRate).to.be.greaterThan(data.gold.gold24K.buyingRate);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Metal rates created successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "shopId": "65f1234567890abcdef12345",
    "rateDate": "2024-02-09T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6800,
        "sellingRate": 6850
      },
      "gold22K": {
        "buyingRate": 6200,
        "sellingRate": 6250
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 78,
        "sellingRate": 82
      }
    },
    "isCurrent": true,
    "isActive": true
  }
}
```

---

### 1.2 Create Rate - FAILURE (Missing Selling Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800
    }
  },
  "weightUnit": "gram"
}
```

**Tests:**
```javascript
pm.test("Status code is 400 (Bad Request)", function () {
    pm.response.to.have.status(400);
});

pm.test("Error message indicates missing selling rate", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.error || jsonData.message).to.match(/selling.*rate.*required/i);
});

pm.test("Validation errors are present", function () {
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
      "field": "gold.gold24K.sellingRate",
      "message": "Gold 24K selling rate is required"
    }
  ]
}
```

---

### 1.3 Create Rate - FAILURE (Selling Rate Less Than Buying Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800,
      "sellingRate": 6700
    }
  },
  "weightUnit": "gram"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates selling rate cannot be less than buying rate", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/selling.*less.*buying/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Selling rate cannot be less than buying rate for Gold 24K"
}
```

---

### 1.4 Create Rate - FAILURE (Invalid Weight Unit) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800,
      "sellingRate": 6850
    }
  },
  "weightUnit": "ounce"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid weight unit", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/weight.*unit.*gram|kg|tola/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Weight unit must be: gram, kg, or tola"
}
```

---

### 1.5 Create Rate - FAILURE (Negative Rate Values) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": -6800,
      "sellingRate": 6850
    }
  },
  "weightUnit": "gram"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates rate must be positive", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/positive.*number/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Gold 24K buying rate must be a positive number"
}
```

---

### 1.6 Update Today's Rate - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:** (Same as create - will update existing)
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6850,
      "sellingRate": 6900
    }
  },
  "weightUnit": "gram",
  "notes": "Updated rates - price increase"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rate updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/updated/i);
});

pm.test("Updated values are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.gold.gold24K.buyingRate).to.eql(6850);
    pm.expect(data.notes).to.include("Updated");
});
```

---

### 1.7 Deactivate Rate - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/metal-rates/{{rateId}}/deactivate`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rate deactivated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.isActive).to.eql(false);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Metal rate deactivated successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "isActive": false
  }
}
```

---

### 1.8 Deactivate Rate - FAILURE (Invalid Rate ID) ❌

**Endpoint:** `PATCH {{baseUrl}}/metal-rates/invalid-id/deactivate`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid ID format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid rate ID format"
}
```

---

### 1.9 Soft Delete Rate - SUCCESS ✅

**Prerequisite:** Rate must not be current

**Endpoint:** `DELETE {{baseUrl}}/metal-rates/{{rateId}}`

**Tests:**
```javascript
pm.test("Status code is 204", function () {
    pm.response.to.have.status(204);
});

pm.test("No content returned", function () {
    pm.expect(pm.response.text()).to.be.empty;
});
```

**Expected Response (204 No Content)**

---

### 1.10 Soft Delete Rate - FAILURE (Cannot Delete Current Rate) ❌

**Endpoint:** `DELETE {{baseUrl}}/metal-rates/{{currentRateId}}`

**Tests:**
```javascript
pm.test("Status code is 409 (Conflict)", function () {
    pm.response.to.have.status(409);
});

pm.test("Error indicates cannot delete current rate", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/cannot.*delete.*current/i);
});
```

**Expected Response (409):**
```json
{
  "success": false,
  "error": "Cannot delete current rate. Please create a new rate first."
}
```

---

## 2. RATE RETRIEVAL

### 2.1 Get Current Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Current rate returned successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('isCurrent');
    pm.expect(jsonData.data.isCurrent).to.eql(true);
});

pm.test("Rate has complete metal data", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('gold');
    pm.expect(data).to.have.property('rateDate');
    pm.expect(data).to.have.property('weightUnit');
});

pm.test("Cache metadata is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta).to.have.property('cached');
});

pm.test("Response time is fast (cached)", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Current metal rates",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "shopId": "65f1234567890abcdef12345",
    "rateDate": "2024-02-09T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6800,
        "sellingRate": 6850
      },
      "gold22K": {
        "buyingRate": 6200,
        "sellingRate": 6250
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 78,
        "sellingRate": 82
      }
    },
    "isCurrent": true,
    "weightUnit": "gram",
    "currency": "INR"
  },
  "meta": {
    "cached": true
  }
}
```

---

### 2.2 Get Current Rate - FAILURE (Invalid Shop ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/invalid-id/metal-rates/current`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid shop ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*shop.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid shop ID format"
}
```

---

### 2.3 Get Current Rate - FAILURE (Shop Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/65f0000000000000000000000/metal-rates/current`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates no current rate found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/no.*current.*rate/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "No current metal rate found. Please update today's rates."
}
```

---

### 2.4 Get Rate History - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rate history returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Pagination metadata is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta.pagination).to.have.property('currentPage');
    pm.expect(jsonData.meta.pagination).to.have.property('totalPages');
    pm.expect(jsonData.meta.pagination).to.have.property('totalItems');
    pm.expect(jsonData.meta.pagination).to.have.property('hasNextPage');
    pm.expect(jsonData.meta.pagination).to.have.property('hasPrevPage');
});

pm.test("Each rate has required fields", function () {
    const rates = pm.response.json().data;
    if (rates.length > 0) {
        rates.forEach(rate => {
            pm.expect(rate).to.have.property('_id');
            pm.expect(rate).to.have.property('rateDate');
            pm.expect(rate).to.have.property('gold');
        });
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Rate history retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "rateDate": "2024-02-09T00:00:00.000Z",
      "gold": { "gold24K": { "buyingRate": 6800, "sellingRate": 6850 } },
      "silver": { "pure": { "buyingRate": 78, "sellingRate": 82 } }
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "pageSize": 10,
      "totalItems": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 2.5 Get Rate History with Date Range - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=2024-01-01&endDate=2024-02-09&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rates within date range", function () {
    const rates = pm.response.json().data;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-09');
    
    rates.forEach(rate => {
        const rateDate = new Date(rate.rateDate);
        pm.expect(rateDate).to.be.at.least(startDate);
        pm.expect(rateDate).to.be.at.most(endDate);
    });
});
```

---

### 2.6 Get Rate History - FAILURE (Invalid Date Format) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=2024/02/01`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid date format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/valid.*date.*YYYY-MM-DD/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Start date must be a valid date (YYYY-MM-DD)"
}
```

---

### 2.7 Get Rate History - FAILURE (End Date Before Start Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=2024-02-09&endDate=2024-01-01`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid date range", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/end.*date.*greater/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "End date must be greater than or equal to start date"
}
```

---

### 2.8 Get Rate History - FAILURE (Invalid Page Number) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?page=0`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid page", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/page.*positive/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Page must be a positive integer"
}
```

---

### 2.9 Get Rate History - FAILURE (Limit Exceeds Maximum) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?limit=150`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for limit exceeded", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/limit.*between.*1.*100/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Limit must be between 1 and 100"
}
```

---

### 2.10 Get Rate by Specific Date - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/2024-02-05`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rate for specific date returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('rateDate');
    
    const rateDate = new Date(jsonData.data.rateDate);
    const requestedDate = new Date('2024-02-05');
    pm.expect(rateDate.toDateString()).to.eql(requestedDate.toDateString());
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Rate for 2024-02-05 retrieved successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "rateDate": "2024-02-05T00:00:00.000Z",
    "gold": { "gold24K": { "buyingRate": 6750, "sellingRate": 6800 } }
  }
}
```

---

### 2.11 Get Rate by Date - FAILURE (Invalid Date Format) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/05-02-2024`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid date format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/YYYY-MM-DD/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Date must be in YYYY-MM-DD format"
}
```

---

### 2.12 Get Rate by Date - FAILURE (Rate Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/2024-01-01`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates no rate found for date", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/no.*rate.*found.*2024-01-01/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "No rate found for date: 2024-01-01"
}
```

---

### 2.13 Get Latest Rates - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/latest?limit=5`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Latest rates returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    pm.expect(jsonData.data.length).to.be.at.most(5);
});

pm.test("Rates are in descending order by date", function () {
    const rates = pm.response.json().data;
    for (let i = 0; i < rates.length - 1; i++) {
        const currentDate = new Date(rates[i].rateDate);
        const nextDate = new Date(rates[i + 1].rateDate);
        pm.expect(currentDate).to.be.at.least(nextDate);
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Latest rates retrieved",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "rateDate": "2024-02-09T00:00:00.000Z",
      "gold": { "gold24K": { "buyingRate": 6800, "sellingRate": 6850 } }
    }
  ]
}
```

---

### 2.14 Get Rate for Specific Purity - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/gold/22K`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purity rate returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.metalType).to.eql("gold");
    pm.expect(jsonData.data.purity).to.eql("22K");
    pm.expect(jsonData.data).to.have.property('buyingRate');
    pm.expect(jsonData.data).to.have.property('sellingRate');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Rate for purity retrieved",
  "data": {
    "metalType": "gold",
    "purity": "22K",
    "buyingRate": 6200,
    "sellingRate": 6250,
    "rateDate": "2024-02-09T00:00:00.000Z"
  }
}
```

---

### 2.15 Get Purity Rate - FAILURE (Invalid Metal Type) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/copper/99`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid metal type", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/metal.*type.*gold|silver|platinum/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Metal type must be: gold, silver, or platinum"
}
```

---

### 2.16 Get Purity Rate - FAILURE (Invalid Purity for Metal) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/gold/999`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid purity", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*purity.*gold/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid purity for gold. Valid options: 24K, 22K, 20K, 18K, 14K"
}
```

---

## 3. RATE ANALYTICS

### 3.1 Compare Rates - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?fromDate=2024-02-01&toDate=2024-02-09`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Comparison data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('fromDate');
    pm.expect(data).to.have.property('toDate');
    pm.expect(data).to.have.property('daysDifference');
    pm.expect(data).to.have.property('gold24K');
    pm.expect(data).to.have.property('trendComparison');
});

pm.test("Gold 24K comparison has all fields", function () {
    const gold24K = pm.response.json().data.gold24K;
    pm.expect(gold24K).to.have.property('startRate');
    pm.expect(gold24K).to.have.property('endRate');
    pm.expect(gold24K).to.have.property('change');
    pm.expect(gold24K).to.have.property('changePercentage');
    pm.expect(gold24K).to.have.property('trend');
    pm.expect(['up', 'down', 'stable']).to.include(gold24K.trend);
});

pm.test("Change percentage is calculated correctly", function () {
    const gold24K = pm.response.json().data.gold24K;
    const expectedChange = ((gold24K.endRate - gold24K.startRate) / gold24K.startRate) * 100;
    pm.expect(Math.abs(gold24K.changePercentage - expectedChange)).to.be.below(0.01);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Rate comparison completed",
  "data": {
    "fromDate": "2024-02-01",
    "toDate": "2024-02-09",
    "daysDifference": 8,
    "gold24K": {
      "startRate": 6750,
      "endRate": 6850,
      "change": 100,
      "changePercentage": 1.48,
      "trend": "up"
    },
    "gold22K": {
      "startRate": 6150,
      "endRate": 6250,
      "change": 100,
      "changePercentage": 1.63,
      "trend": "up"
    },
    "silver": {
      "startRate": 76,
      "endRate": 82,
      "change": 6,
      "changePercentage": 7.89,
      "trend": "up"
    },
    "trendComparison": {
      "gold": {
        "ma7Change": 50,
        "ma30Change": 120,
        "ma90Change": 200
      },
      "silver": {
        "ma7Change": 3,
        "ma30Change": 8,
        "ma90Change": 12
      }
    }
  }
}
```

---

### 3.2 Compare Rates - FAILURE (Missing Required Parameters) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?fromDate=2024-02-01`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates both dates required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/both.*fromDate.*toDate.*required/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Both fromDate and toDate are required"
}
```

---

### 3.3 Compare Rates - FAILURE (To Date Before From Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?fromDate=2024-02-09&toDate=2024-02-01`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid date range", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/toDate.*greater.*fromDate/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "toDate must be greater than or equal to fromDate"
}
```

---

### 3.4 Get Trend Chart Data - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?metalType=gold&days=30`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Trend data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('metalType');
    pm.expect(data).to.have.property('period');
    pm.expect(data).to.have.property('dataPoints');
    pm.expect(data).to.have.property('trendData');
    pm.expect(data).to.have.property('summary');
});

pm.test("Trend data array has correct structure", function () {
    const trendData = pm.response.json().data.trendData;
    pm.expect(trendData).to.be.an('array');
    
    if (trendData.length > 0) {
        trendData.forEach(point => {
            pm.expect(point).to.have.property('date');
            pm.expect(point).to.have.property('rate');
            pm.expect(point).to.have.property('ma7');
            pm.expect(point).to.have.property('ma30');
        });
    }
});

pm.test("Summary has all statistics", function () {
    const summary = pm.response.json().data.summary;
    pm.expect(summary).to.have.property('currentRate');
    pm.expect(summary).to.have.property('startRate');
    pm.expect(summary).to.have.property('highestRate');
    pm.expect(summary).to.have.property('lowestRate');
    pm.expect(summary).to.have.property('averageRate');
});

pm.test("Data points count matches requested days", function () {
    const data = pm.response.json().data;
    pm.expect(data.period).to.eql(30);
    pm.expect(data.dataPoints).to.be.at.most(30);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Trend data retrieved successfully",
  "data": {
    "metalType": "gold",
    "period": 30,
    "dataPoints": 30,
    "trendData": [
      {
        "date": "2024-02-09",
        "rate": 6850,
        "ma7": 6820,
        "ma30": 6750,
        "ma90": 6700
      },
      {
        "date": "2024-02-08",
        "rate": 6800,
        "ma7": 6790,
        "ma30": 6740,
        "ma90": 6690
      }
    ],
    "summary": {
      "currentRate": 6850,
      "startRate": 6600,
      "highestRate": 6900,
      "lowestRate": 6550,
      "averageRate": 6725
    }
  },
  "meta": {
    "cached": false
  }
}
```

---

### 3.5 Get Trends - FAILURE (Invalid Metal Type) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?metalType=copper`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid metal type", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/metal.*type.*gold|silver|platinum/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Metal type must be: gold, silver, or platinum"
}
```

---

### 3.6 Get Trends - FAILURE (Invalid Days Value) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?days=0`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid days", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/days.*positive/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Days must be a positive number"
}
```

---

### 3.7 Get Trends - FAILURE (Days Exceeds Maximum) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?days=400`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for exceeding max days", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/days.*between.*1.*365/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Days must be between 1 and 365"
}
```

---

### 3.8 Get Average Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/average?metalType=gold&purity=24K&days=30`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Average rate data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('metalType');
    pm.expect(data).to.have.property('purity');
    pm.expect(data).to.have.property('period');
    pm.expect(data).to.have.property('averageBuyingRate');
    pm.expect(data).to.have.property('averageSellingRate');
    pm.expect(data).to.have.property('samples');
});

pm.test("Average rates are positive numbers", function () {
    const data = pm.response.json().data;
    pm.expect(data.averageBuyingRate).to.be.greaterThan(0);
    pm.expect(data.averageSellingRate).to.be.greaterThan(0);
});

pm.test("Samples count is positive", function () {
    const data = pm.response.json().data;
    pm.expect(data.samples).to.be.greaterThan(0);
    pm.expect(data.samples).to.be.at.most(30);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Average rate calculated",
  "data": {
    "metalType": "gold",
    "purity": "24K",
    "period": "30 days",
    "averageBuyingRate": 6725.50,
    "averageSellingRate": 6775.50,
    "samples": 30
  }
}
```

---

### 3.9 Get Average Rate - FAILURE (Invalid Days) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/average?days=-5`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for negative days", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/days.*positive/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Days must be a positive number"
}
```

---

## 4. ORGANIZATION OPERATIONS

### 4.1 Sync Rates to All Shops - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/organizations/{{organizationId}}/metal-rates/sync`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800,
      "sellingRate": 6850
    },
    "gold22K": {
      "buyingRate": 6200,
      "sellingRate": 6250
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 78,
      "sellingRate": 82
    }
  },
  "weightUnit": "gram",
  "currency": "INR"
}
```

**Tests:**
```javascript
pm.test("Status code is 200 or 207", function () {
    pm.expect([200, 207]).to.include(pm.response.code);
});

pm.test("Sync operation completed", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/synced/i);
});

pm.test("Sync data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('totalShops');
    pm.expect(data).to.have.property('syncedShops');
    pm.expect(data).to.have.property('failedShops');
    pm.expect(data).to.have.property('failures');
});

pm.test("All or most shops synced successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.syncedShops).to.be.greaterThan(0);
    pm.expect(data.failures).to.be.an('array');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Rates synced to all shops successfully",
  "data": {
    "totalShops": 10,
    "syncedShops": 10,
    "failedShops": 0,
    "failures": []
  }
}
```

---

### 4.2 Sync Rates - FAILURE (Unauthorized User) ❌

**Endpoint:** `POST {{baseUrl}}/organizations/{{differentOrgId}}/metal-rates/sync`

**Tests:**
```javascript
pm.test("Status code is 403 (Forbidden)", function () {
    pm.response.to.have.status(403);
});

pm.test("Error indicates unauthorized access", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/own.*organization/i);
});
```

**Expected Response (403):**
```json
{
  "success": false,
  "error": "You can only sync rates for your own organization"
}
```

---

### 4.3 Sync Rates - FAILURE (No Active Shops) ❌

**Endpoint:** `POST {{baseUrl}}/organizations/{{emptyOrgId}}/metal-rates/sync`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates no active shops", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/no.*active.*shops/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "No active shops found for this organization"
}
```

---

### 4.4 Get Organization Master Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/organizations/{{organizationId}}/metal-rates/current`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Organization master rate returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('organizationId');
    pm.expect(jsonData.data).to.have.property('gold');
    pm.expect(jsonData.data).to.have.property('silver');
});

pm.test("Organization ID matches", function () {
    const data = pm.response.json().data;
    const orgId = pm.collectionVariables.get('organizationId');
    pm.expect(data.organizationId.toString()).to.eql(orgId);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Organization master rate retrieved",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "organizationId": "65f9999999999999999999999",
    "gold": {
      "gold24K": {
        "buyingRate": 6800,
        "sellingRate": 6850
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 78,
        "sellingRate": 82
      }
    },
    "weightUnit": "gram",
    "currency": "INR",
    "rateDate": "2024-02-09T00:00:00.000Z"
  }
}
```

---

### 4.5 Get Organization Master Rate - FAILURE (Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/organizations/65f0000000000000000000000/metal-rates/current`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates no master rate found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/no.*master.*rate/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "No master rate found for this organization"
}
```

---

## Summary of Test Scenarios

### Total Routes Tested: 13

#### Route Breakdown:
1. **Rate CRUD Operations (5 routes)**
   - Create/Update Rate
   - Deactivate Rate
   - Soft Delete Rate

2. **Rate Retrieval (4 routes)**
   - Get Current Rate
   - Get Rate History
   - Get Rate by Date
   - Get Latest Rates
   - Get Rate by Purity

3. **Rate Analytics (2 routes)**
   - Compare Rates
   - Get Trend Data
   - Get Average Rate

4. **Organization Operations (2 routes)**
   - Sync Rates to All Shops
   - Get Organization Master Rate

#### Test Coverage:
- **Positive Tests (Success ✅):** 13+ scenarios
- **Negative Tests (Failure ❌):** 20+ scenarios

### Test Categories:

#### 1. Validation Errors
- Missing required fields
- Invalid data types
- Negative values
- Invalid enum values
- Selling rate < Buying rate

#### 2. Format Errors
- Invalid date formats
- Invalid ID formats
- Invalid metal types
- Invalid purity values

#### 3. Business Logic Errors
- End date before start date
- Cannot delete current rate
- Unauthorized organization access
- No active shops

#### 4. Not Found Errors
- Invalid shop ID
- Invalid rate ID
- No rate for date
- No master rate

---

## Postman Collection Setup

### Environment Variables
```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "YOUR_JWT_TOKEN",
  "shopId": "65f1234567890abcdef12345",
  "organizationId": "65f9999999999999999999999",
  "rateId": "",
  "currentRateId": "",
  "differentOrgId": "65f8888888888888888888888"
}
```

### Pre-request Script (Collection Level)
```javascript
// Add authentication header
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('authToken')
});

// Add timestamp for logging
pm.environment.set('requestTimestamp', new Date().toISOString());
```

### Tests Script (Collection Level)
```javascript
// Common tests for all requests
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(3000);
});

pm.test("Response has proper structure", function () {
    const jsonData = pm.response.json();
    if (pm.response.code === 200 || pm.response.code === 201) {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData).to.have.property('data');
    }
});

pm.test("Content-Type is JSON", function () {
    pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json');
});
```

---

## Testing Workflows

### Workflow 1: Daily Rate Update
```
1. POST - Create/Update Today's Rate
2. GET - Fetch Current Rate (verify cached)
3. GET - View Rate History
4. GET - Get Latest 5 Rates
```

### Workflow 2: Rate Analysis
```
1. GET - Compare rates (last 7 days)
2. GET - Get trend data (30 days)
3. GET - Get average rate (30 days)
4. GET - Get specific purity rate
```

### Workflow 3: Organization Admin
```
1. POST - Sync rates to all shops
2. GET - Get organization master rate
3. GET - Verify individual shop rates
4. GET - Compare shop rates
```

### Workflow 4: Historical Analysis
```
1. GET - Get rate by specific date
2. GET - Get rate history with date range
3. GET - Compare two dates
4. GET - Get trend chart data
```

---

## Response Time Benchmarks

| Endpoint Type | Expected Time |
|--------------|---------------|
| GET Current (Cached) | < 200ms |
| GET Current (Uncached) | < 500ms |
| POST Create/Update | < 1000ms |
| GET History (Paginated) | < 800ms |
| GET Trends/Analytics | < 1500ms |
| POST Sync (Multi-shop) | < 2000ms |

---

## Error Response Standards

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "gold.gold24K.sellingRate",
      "message": "Selling rate is required"
    }
  ]
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
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Cannot delete current rate"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "requestId": "req_123456789"
}
```

---

## Testing Best Practices

### 1. Test Data Management
- Use separate test shop IDs
- Clean up test data after bulk operations
- Maintain test data consistency

### 2. Test Execution Order
- Run authentication tests first
- Execute dependent tests in sequence
- Use Collection Runner for batch testing

### 3. Assertions
- Always verify response structure
- Check data types and ranges
- Validate business logic constraints

### 4. Error Handling
- Test all error scenarios
- Verify error message clarity
- Check HTTP status codes

### 5. Performance
- Monitor response times
- Check cache effectiveness
- Test with realistic data volumes

---

## Quick Reference

### Metal Types
- `gold` - Gold with purities: 24K, 22K, 20K, 18K, 14K
- `silver` - Silver with types: pure, sterling925
- `platinum` - Platinum

### Weight Units
- `gram` - Grams (default)
- `kg` - Kilograms
- `tola` - Tola (Indian measurement)

### Currency
- `INR` - Indian Rupees (default)
- `USD` - US Dollars
- `EUR` - Euros

### Date Format
- Always use: `YYYY-MM-DD`
- Example: `2024-02-09`

### Pagination
- Default page: 1
- Default limit: 10
- Max limit: 100

---

## Common Testing Scenarios

### Scenario 1: First Time Setup
```javascript
// 1. Create first rate for shop
POST /shops/{{shopId}}/metal-rates

// 2. Verify it's set as current
GET /shops/{{shopId}}/metal-rates/current

// 3. Check it appears in history
GET /shops/{{shopId}}/metal-rates/history
```

### Scenario 2: Daily Update
```javascript
// 1. Get yesterday's rate
GET /shops/{{shopId}}/metal-rates/current

// 2. Update with today's rate
POST /shops/{{shopId}}/metal-rates

// 3. Compare changes
GET /shops/{{shopId}}/metal-rates/compare?fromDate=YESTERDAY&toDate=TODAY
```

### Scenario 3: Trend Analysis
```javascript
// 1. Get 30-day trend
GET /shops/{{shopId}}/metal-rates/trends?days=30

// 2. Get average rate
GET /shops/{{shopId}}/metal-rates/average?days=30

// 3. Compare date ranges
GET /shops/{{shopId}}/metal-rates/compare?fromDate=START&toDate=END
```

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check JWT token validity
   - Verify token in environment variables
   - Ensure Authorization header is set

2. **404 Not Found**
   - Verify shop ID exists
   - Check if rate exists for the date
   - Confirm organization has shops

3. **400 Validation Error**
   - Review request body structure
   - Check required fields
   - Validate data types and ranges

4. **Cache Issues**
   - Wait for cache expiry (1 hour)
   - Create new rate to invalidate cache
   - Check cache headers in response

---

**Last Updated:** February 09, 2026  
**API Version:** v1  
**Base URL:** http://localhost:3000/api/v1  
**Total Tests:** 33+ test scenarios  
**Test Coverage:** 100% of all routes

---

**Happy Testing! 🚀**
