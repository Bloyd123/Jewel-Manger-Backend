# Metal Rate Management - Postman Test Collection
## Complete Test Suite for All Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Shop-Level Routes (9 Routes)](#1-shop-level-routes)
3. [Organization-Level Routes (2 Routes)](#2-organization-level-routes)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:5000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: YOUR_SHOP_ID
organizationId: YOUR_ORGANIZATION_ID
rateId: (auto-set from create)
```

### Headers (Global)
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

---

## 1. SHOP-LEVEL ROUTES

### 1.1 Create or Update Today's Rate

#### 1.1.1 Create Rate - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Permission Required:** `canUpdateMetalRates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6500,
      "sellingRate": 6550
    },
    "gold22K": {
      "buyingRate": 5950,
      "sellingRate": 6000
    },
    "gold18K": {
      "buyingRate": 4875,
      "sellingRate": 4920
    },
    "gold14K": {
      "buyingRate": 3790,
      "sellingRate": 3830
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 75,
      "sellingRate": 78
    },
    "sterling925": {
      "buyingRate": 69,
      "sellingRate": 72
    }
  },
  "platinum": {
    "buyingRate": 3200,
    "sellingRate": 3250
  },
  "weightUnit": "gram",
  "currency": "INR",
  "rateSource": "market",
  "notes": "Daily market rates as of today morning",
  "internalNotes": "Updated after consultation with jewelers association",
  "marketReference": {
    "internationalGoldPrice": 2050.50,
    "internationalSilverPrice": 24.30,
    "exchangeRate": 83.25,
    "referenceSource": "MCX & International Markets"
  }
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Metal rates created successfully",
  "data": {
    "_id": "65c4f5e8a1234567890abcde",
    "shopId": "65c4f5e8a1234567890abcd0",
    "organizationId": "65c4f5e8a1234567890abc00",
    "purchaseNumber": "MR-2024-02-09-001",
    "rateDate": "2024-02-09T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6500,
        "sellingRate": 6550,
        "margin": 50,
        "marginPercentage": 0.77
      },
      "gold22K": {
        "buyingRate": 5950,
        "sellingRate": 6000,
        "margin": 50,
        "marginPercentage": 0.84
      },
      "gold18K": {
        "buyingRate": 4875,
        "sellingRate": 4920,
        "margin": 45,
        "marginPercentage": 0.92
      },
      "gold14K": {
        "buyingRate": 3790,
        "sellingRate": 3830,
        "margin": 40,
        "marginPercentage": 1.06
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 75,
        "sellingRate": 78,
        "margin": 3,
        "marginPercentage": 4.0
      },
      "sterling925": {
        "buyingRate": 69,
        "sellingRate": 72,
        "margin": 3,
        "marginPercentage": 4.35
      }
    },
    "platinum": {
      "buyingRate": 3200,
      "sellingRate": 3250,
      "margin": 50,
      "marginPercentage": 1.56
    },
    "baseRates": {
      "gold24K": 6500,
      "silver999": 75,
      "platinum": 3200
    },
    "autoConvertedRates": {
      "gold": {
        "gold22K": 5958.33,
        "gold20K": 5416.67,
        "gold18K": 4875.0,
        "gold14K": 3791.67
      },
      "silver": {
        "sterling925": 69.38
      }
    },
    "changes": {
      "gold24K": {
        "change": 50,
        "changePercentage": 0.77,
        "trend": "up"
      },
      "silver999": {
        "change": 2,
        "changePercentage": 2.67,
        "trend": "up"
      }
    },
    "trendData": {
      "gold": {
        "ma7": 6480,
        "ma30": 6450,
        "ma90": 6400
      },
      "silver": {
        "ma7": 74.5,
        "ma30": 73.8,
        "ma90": 72.5
      }
    },
    "weightUnit": "gram",
    "currency": "INR",
    "rateSource": "market",
    "notes": "Daily market rates as of today morning",
    "isCurrent": true,
    "isActive": true,
    "validFrom": "2024-02-09T05:30:00.000Z",
    "createdBy": "65c4f5e8a1234567890abc11",
    "createdAt": "2024-02-09T05:30:00.000Z",
    "updatedAt": "2024-02-09T05:30:00.000Z",
    "isNew": true
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Rate created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("created");
});

pm.test("Rate has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('rateDate');
    pm.expect(data).to.have.property('gold');
    pm.expect(data).to.have.property('silver');
    pm.expect(data).to.have.property('baseRates');
    pm.expect(data).to.have.property('autoConvertedRates');
    
    // Save rateId for later tests
    pm.collectionVariables.set('rateId', data._id);
});

pm.test("Margins are calculated correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.gold.gold24K.margin).to.eql(50);
    pm.expect(data.gold.gold24K.marginPercentage).to.be.greaterThan(0);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

---

#### 1.1.2 Update Existing Rate - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6550,
      "sellingRate": 6600
    },
    "gold22K": {
      "buyingRate": 6000,
      "sellingRate": 6050
    },
    "gold18K": {
      "buyingRate": 4920,
      "sellingRate": 4965
    },
    "gold14K": {
      "buyingRate": 3830,
      "sellingRate": 3870
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 76,
      "sellingRate": 79
    },
    "sterling925": {
      "buyingRate": 70,
      "sellingRate": 73
    }
  },
  "platinum": {
    "buyingRate": 3250,
    "sellingRate": 3300
  },
  "notes": "Afternoon update - rates increased"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Metal rates updated successfully",
  "data": {
    "_id": "65c4f5e8a1234567890abcde",
    "gold": {
      "gold24K": {
        "buyingRate": 6550,
        "sellingRate": 6600
      }
    },
    "changes": {
      "gold24K": {
        "change": 50,
        "changePercentage": 0.76,
        "trend": "up"
      }
    },
    "updatedBy": "65c4f5e8a1234567890abc11",
    "updatedAt": "2024-02-09T09:30:00.000Z",
    "isNew": false
  }
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
    pm.expect(jsonData.data.isNew).to.eql(false);
});

pm.test("Updated values are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.gold.gold24K.buyingRate).to.eql(6550);
});
```

---

#### 1.1.3 Create Rate - FAILURE (Missing Gold 24K Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold22K": {
      "buyingRate": 5950,
      "sellingRate": 6000
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 75,
      "sellingRate": 78
    }
  }
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "gold.gold24K.buyingRate",
      "message": "Gold 24K buying rate is required",
      "value": undefined
    },
    {
      "field": "gold.gold24K.sellingRate",
      "message": "Gold 24K selling rate is required",
      "value": undefined
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing required field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData.errors).to.be.an('array');
});
```

---

#### 1.1.4 Create Rate - FAILURE (Negative Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": -100,
      "sellingRate": 6550
    },
    "gold22K": {
      "buyingRate": 5950,
      "sellingRate": 6000
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 75,
      "sellingRate": 78
    }
  }
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "gold.gold24K.buyingRate",
      "message": "Gold 24K buying rate must be a positive number",
      "value": -100
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates negative rate not allowed", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors[0].message).to.match(/positive/i);
});
```

---

#### 1.1.5 Create Rate - FAILURE (Selling Rate < Buying Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6550,
      "sellingRate": 6500
    },
    "gold22K": {
      "buyingRate": 5950,
      "sellingRate": 6000
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 75,
      "sellingRate": 78
    }
  }
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "gold.gold24K.sellingRate",
      "message": "Selling rate cannot be less than buying rate for Gold 24K",
      "value": 6500
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Business logic validation error", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors[0].message).to.match(/selling rate cannot be less than buying rate/i);
});
```

---

#### 1.1.6 Create Rate - FAILURE (Invalid Weight Unit) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6500,
      "sellingRate": 6550
    },
    "gold22K": {
      "buyingRate": 5950,
      "sellingRate": 6000
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 75,
      "sellingRate": 78
    }
  },
  "weightUnit": "pound"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "weightUnit",
      "message": "Weight unit must be: gram, kg, or tola",
      "value": "pound"
    }
  ]
}
```

---

#### 1.1.7 Create Rate - FAILURE (Unauthorized) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/metal-rates`

**Headers:** 
```
Authorization: Bearer invalid_token
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login again.",
  "statusCode": 401
}
```

**Tests:**
```javascript
pm.test("Status code is 401", function () {
    pm.response.to.have.status(401);
});

pm.test("Unauthorized error message", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/unauthorized/i);
});
```

---

### 1.2 Get Current Rate

#### 1.2.1 Get Current Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current`

**Permission Required:** Any shop access

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Current metal rates",
  "data": {
    "_id": "65c4f5e8a1234567890abcde",
    "shopId": "65c4f5e8a1234567890abcd0",
    "rateDate": "2024-02-09T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6550,
        "sellingRate": 6600,
        "margin": 50,
        "marginPercentage": 0.76
      },
      "gold22K": {
        "buyingRate": 6000,
        "sellingRate": 6050,
        "margin": 50,
        "marginPercentage": 0.83
      },
      "gold18K": {
        "buyingRate": 4920,
        "sellingRate": 4965,
        "margin": 45,
        "marginPercentage": 0.91
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 76,
        "sellingRate": 79,
        "margin": 3,
        "marginPercentage": 3.95
      },
      "sterling925": {
        "buyingRate": 70,
        "sellingRate": 73,
        "margin": 3,
        "marginPercentage": 4.29
      }
    },
    "platinum": {
      "buyingRate": 3250,
      "sellingRate": 3300,
      "margin": 50,
      "marginPercentage": 1.54
    },
    "baseRates": {
      "gold24K": 6550,
      "silver999": 76,
      "platinum": 3250
    },
    "changes": {
      "gold24K": {
        "change": 50,
        "changePercentage": 0.76,
        "trend": "up"
      }
    },
    "trendData": {
      "gold": {
        "ma7": 6480,
        "ma30": 6450,
        "ma90": 6400
      }
    },
    "isCurrent": true,
    "weightUnit": "gram",
    "currency": "INR"
  },
  "cached": false
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Current rate retrieved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('isCurrent', true);
});

pm.test("All metal rates are present", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('gold');
    pm.expect(data).to.have.property('silver');
    pm.expect(data).to.have.property('platinum');
    pm.expect(data.gold).to.have.property('gold24K');
});

pm.test("Response time is fast (heavily cached)", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

#### 1.2.2 Get Current Rate - FAILURE (No Rate Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current`

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No current metal rate found. Please update today's rates.",
  "statusCode": 404
}
```

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Not found error message", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/no current.*rate found/i);
});
```

---

#### 1.2.3 Get Current Rate - FAILURE (Invalid Shop ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/invalid_shop_id/metal-rates/current`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid shop ID format",
  "statusCode": 400
}
```

---

### 1.3 Get Rate History

#### 1.3.1 Get Rate History - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=2024-01-01&endDate=2024-02-09&page=1&limit=10`

**Permission Required:** `canViewReports`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate history retrieved successfully",
  "data": [
    {
      "_id": "65c4f5e8a1234567890abcde",
      "rateDate": "2024-02-09T00:00:00.000Z",
      "gold": {
        "gold24K": {
          "buyingRate": 6550,
          "sellingRate": 6600
        },
        "gold22K": {
          "buyingRate": 6000,
          "sellingRate": 6050
        }
      },
      "silver": {
        "pure": {
          "buyingRate": 76,
          "sellingRate": 79
        }
      },
      "platinum": {
        "buyingRate": 3250,
        "sellingRate": 3300
      },
      "changes": {
        "gold24K": {
          "change": 50,
          "changePercentage": 0.76,
          "trend": "up"
        }
      },
      "trendData": {
        "gold": {
          "ma7": 6480,
          "ma30": 6450,
          "ma90": 6400
        }
      },
      "isCurrent": true,
      "weightUnit": "gram",
      "currency": "INR"
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "pageSize": 10,
      "totalItems": 45,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("History data is an array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("Pagination metadata is present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta).to.have.property('pagination');
    pm.expect(jsonData.meta.pagination).to.have.property('currentPage');
    pm.expect(jsonData.meta.pagination).to.have.property('totalPages');
});

pm.test("Rates are within date range", function () {
    const data = pm.response.json().data;
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-02-09');
    
    data.forEach(rate => {
        const rateDate = new Date(rate.rateDate);
        pm.expect(rateDate).to.be.at.least(startDate);
        pm.expect(rateDate).to.be.at.most(endDate);
    });
});
```

---

#### 1.3.2 Get Rate History - FAILURE (Invalid Date Format) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=invalid-date&endDate=2024-02-09`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "startDate",
      "message": "Start date must be a valid date (YYYY-MM-DD)",
      "value": "invalid-date"
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Date validation error", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.errors[0].message).to.match(/valid date/i);
});
```

---

#### 1.3.3 Get Rate History - FAILURE (End Date Before Start Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/history?startDate=2024-02-09&endDate=2024-01-01`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "endDate",
      "message": "End date must be greater than or equal to start date",
      "value": "2024-01-01"
    }
  ]
}
```

---

### 1.4 Get Latest Rates

#### 1.4.1 Get Latest Rates - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/latest?limit=10`

**Permission Required:** `canViewDashboard`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Latest rates retrieved",
  "data": [
    {
      "_id": "65c4f5e8a1234567890abcde",
      "rateDate": "2024-02-09T00:00:00.000Z",
      "gold": {
        "gold24K": {
          "sellingRate": 6600
        }
      },
      "isCurrent": true
    },
    {
      "_id": "65c4f5e8a1234567890abcdf",
      "rateDate": "2024-02-08T00:00:00.000Z",
      "gold": {
        "gold24K": {
          "sellingRate": 6550
        }
      },
      "isCurrent": false
    }
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Latest rates returned in descending order", function () {
    const data = pm.response.json().data;
    for (let i = 0; i < data.length - 1; i++) {
        const currentDate = new Date(data[i].rateDate);
        const nextDate = new Date(data[i + 1].rateDate);
        pm.expect(currentDate).to.be.at.least(nextDate);
    }
});
```

---

### 1.5 Get Trend Chart Data

#### 1.5.1 Get Trend Data - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?metalType=gold&days=90`

**Permission Required:** `canViewReports`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Trend data retrieved successfully",
  "data": {
    "metalType": "gold",
    "period": 90,
    "dataPoints": 90,
    "trendData": [
      {
        "date": "2024-02-09",
        "rate": 6600,
        "ma7": 6480,
        "ma30": 6450,
        "ma90": 6400
      },
      {
        "date": "2024-02-08",
        "rate": 6550,
        "ma7": 6470,
        "ma30": 6440,
        "ma90": 6395
      }
    ],
    "summary": {
      "currentRate": 6600,
      "startRate": 6200,
      "highestRate": 6650,
      "lowestRate": 6150,
      "averageRate": 6425.5
    }
  },
  "cached": false
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Trend data structure is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('metalType');
    pm.expect(data).to.have.property('period');
    pm.expect(data).to.have.property('trendData');
    pm.expect(data).to.have.property('summary');
});

pm.test("Trend data contains moving averages", function () {
    const data = pm.response.json().data;
    const firstPoint = data.trendData[0];
    pm.expect(firstPoint).to.have.property('ma7');
    pm.expect(firstPoint).to.have.property('ma30');
    pm.expect(firstPoint).to.have.property('ma90');
});

pm.test("Summary calculations are present", function () {
    const summary = pm.response.json().data.summary;
    pm.expect(summary.currentRate).to.be.a('number');
    pm.expect(summary.highestRate).to.be.at.least(summary.lowestRate);
});
```

---

#### 1.5.2 Get Trend Data - FAILURE (Invalid Metal Type) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?metalType=diamond&days=90`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "metalType",
      "message": "Metal type must be: gold, silver, or platinum",
      "value": "diamond"
    }
  ]
}
```

---

#### 1.5.3 Get Trend Data - FAILURE (Invalid Days) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/trends?metalType=gold&days=500`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "days",
      "message": "Days must be between 1 and 365",
      "value": 500
    }
  ]
}
```

---

### 1.6 Compare Rates

#### 1.6.1 Compare Rates - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?fromDate=2024-01-01&toDate=2024-02-09`

**Permission Required:** `canViewReports`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate comparison completed",
  "data": {
    "fromDate": "2024-01-01",
    "toDate": "2024-02-09",
    "daysDifference": 39,
    "gold24K": {
      "startRate": 6200,
      "endRate": 6600,
      "change": 400,
      "changePercentage": 6.45,
      "trend": "up"
    },
    "gold22K": {
      "startRate": 5683,
      "endRate": 6050,
      "change": 367,
      "changePercentage": 6.46,
      "trend": "up"
    },
    "gold18K": {
      "startRate": 4650,
      "endRate": 4965,
      "change": 315,
      "changePercentage": 6.77,
      "trend": "up"
    },
    "silver999": {
      "startRate": 72,
      "endRate": 79,
      "change": 7,
      "changePercentage": 9.72,
      "trend": "up"
    },
    "platinum": {
      "startRate": 3100,
      "endRate": 3300,
      "change": 200,
      "changePercentage": 6.45,
      "trend": "up"
    },
    "trendComparison": {
      "gold": {
        "ma7Change": 30,
        "ma30Change": 150,
        "ma90Change": 280
      },
      "silver": {
        "ma7Change": 2.5,
        "ma30Change": 4.8,
        "ma90Change": 6.5
      }
    }
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Comparison data has all metal types", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('gold24K');
    pm.expect(data).to.have.property('silver999');
    pm.expect(data).to.have.property('platinum');
});

pm.test("Change calculations are correct", function () {
    const gold = pm.response.json().data.gold24K;
    const expectedChange = gold.endRate - gold.startRate;
    pm.expect(gold.change).to.eql(expectedChange);
});

pm.test("Trend comparison data is present", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('trendComparison');
    pm.expect(data.trendComparison).to.have.property('gold');
    pm.expect(data.trendComparison).to.have.property('silver');
});
```

---

#### 1.6.2 Compare Rates - FAILURE (Missing From Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?toDate=2024-02-09`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "fromDate",
      "message": "From date is required"
    }
  ]
}
```

---

#### 1.6.3 Compare Rates - FAILURE (To Date Before From Date) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/compare?fromDate=2024-02-09&toDate=2024-01-01`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "toDate",
      "message": "To date must be greater than or equal to from date",
      "value": "2024-01-01"
    }
  ]
}
```

---

### 1.7 Get Rate by Specific Date

#### 1.7.1 Get Rate by Date - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/2024-02-05`

**Permission Required:** `canViewReports`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate for 2024-02-05 retrieved successfully",
  "data": {
    "_id": "65c4f5e8a1234567890abc00",
    "rateDate": "2024-02-05T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6480,
        "sellingRate": 6530
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 74,
        "sellingRate": 77
      }
    },
    "isCurrent": false
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Rate date matches requested date", function () {
    const data = pm.response.json().data;
    const rateDate = new Date(data.rateDate);
    const requestedDate = new Date('2024-02-05');
    pm.expect(rateDate.toDateString()).to.eql(requestedDate.toDateString());
});
```

---

#### 1.7.2 Get Rate by Date - FAILURE (Invalid Date Format) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/05-02-2024`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "date",
      "message": "Date must be in YYYY-MM-DD format",
      "value": "05-02-2024"
    }
  ]
}
```

---

#### 1.7.3 Get Rate by Date - FAILURE (No Rate Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/date/2024-01-01`

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No rate found for date: 2024-01-01",
  "statusCode": 404
}
```

---

### 1.8 Get Rate for Specific Purity

#### 1.8.1 Get Rate for Purity - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/gold/22K`

**Permission Required:** Any shop access

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate for purity retrieved",
  "data": {
    "metalType": "gold",
    "purity": "22K",
    "buyingRate": 6000,
    "sellingRate": 6050,
    "rateDate": "2024-02-09T00:00:00.000Z"
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Purity-specific rate returned", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('metalType', 'gold');
    pm.expect(data).to.have.property('purity', '22K');
    pm.expect(data).to.have.property('buyingRate');
    pm.expect(data).to.have.property('sellingRate');
});
```

---

#### 1.8.2 Get Rate for Purity - FAILURE (Invalid Purity) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/gold/20K`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "purity",
      "message": "Invalid purity for gold. Valid options: 24K, 22K, 20K, 18K, 14K",
      "value": "20K"
    }
  ]
}
```

---

#### 1.8.3 Get Rate for Purity - FAILURE (Invalid Metal Type) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/current/purity/copper/999`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "metalType",
      "message": "Metal type must be: gold, silver, or platinum",
      "value": "copper"
    }
  ]
}
```

---

### 1.9 Get Average Rate

#### 1.9.1 Get Average Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/average?metalType=gold&purity=24K&days=30`

**Permission Required:** `canViewReports`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Average rate calculated",
  "data": {
    "metalType": "gold",
    "purity": "24K",
    "period": "30 days",
    "averageBuyingRate": 6425.50,
    "averageSellingRate": 6475.80,
    "samples": 30
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Average calculation is correct", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('averageBuyingRate');
    pm.expect(data).to.have.property('averageSellingRate');
    pm.expect(data.averageBuyingRate).to.be.a('number');
    pm.expect(data.samples).to.be.greaterThan(0);
});
```

---

#### 1.9.2 Get Average Rate - FAILURE (Invalid Days) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/metal-rates/average?metalType=gold&purity=24K&days=-5`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "days",
      "message": "Days must be a positive number",
      "value": -5
    }
  ]
}
```

---

## 2. ORGANIZATION-LEVEL ROUTES

### 2.1 Multi-Shop Sync

#### 2.1.1 Sync to All Shops - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/organizations/{{organizationId}}/metal-rates/sync`

**Permission Required:** `super_admin` or `org_admin`

**Request Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6550,
      "sellingRate": 6600
    },
    "gold22K": {
      "buyingRate": 6000,
      "sellingRate": 6050
    },
    "gold18K": {
      "buyingRate": 4920,
      "sellingRate": 4965
    },
    "gold14K": {
      "buyingRate": 3830,
      "sellingRate": 3870
    }
  },
  "silver": {
    "pure": {
      "buyingRate": 76,
      "sellingRate": 79
    },
    "sterling925": {
      "buyingRate": 70,
      "sellingRate": 73
    }
  },
  "platinum": {
    "buyingRate": 3250,
    "sellingRate": 3300
  },
  "notes": "Organization-wide rate update"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rates synced to all shops successfully",
  "data": {
    "totalShops": 15,
    "syncedShops": 15,
    "failedShops": 0,
    "failures": []
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("All shops synced successfully", function () {
    const data = pm.response.json().data;
    pm.expect(data.syncedShops).to.eql(data.totalShops);
    pm.expect(data.failedShops).to.eql(0);
});

pm.test("No failures reported", function () {
    const data = pm.response.json().data;
    pm.expect(data.failures).to.be.an('array').that.is.empty;
});
```

---

#### 2.1.2 Sync to All Shops - PARTIAL SUCCESS (207 Multi-Status) ⚠️

**Endpoint:** `POST {{baseUrl}}/organizations/{{organizationId}}/metal-rates/sync`

**Expected Response (207 Multi-Status):**
```json
{
  "success": true,
  "message": "Rates synced with 2 failure(s)",
  "data": {
    "totalShops": 15,
    "syncedShops": 13,
    "failedShops": 2,
    "failures": [
      {
        "shopId": "65c4f5e8a1234567890abc01",
        "shopName": "Shop ABC",
        "error": "Shop not found"
      },
      {
        "shopId": "65c4f5e8a1234567890abc02",
        "shopName": "Shop XYZ",
        "error": "Database connection error"
      }
    ]
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 207", function () {
    pm.response.to.have.status(207);
});

pm.test("Partial success reported", function () {
    const data = pm.response.json().data;
    pm.expect(data.syncedShops).to.be.lessThan(data.totalShops);
    pm.expect(data.failedShops).to.be.greaterThan(0);
});

pm.test("Failure details provided", function () {
    const data = pm.response.json().data;
    pm.expect(data.failures).to.be.an('array');
    pm.expect(data.failures.length).to.eql(data.failedShops);
});
```

---

#### 2.1.3 Sync to All Shops - FAILURE (Unauthorized) ❌

**Endpoint:** `POST {{baseUrl}}/organizations/{{organizationId}}/metal-rates/sync`

**User Role:** `shop_admin` (not authorized)

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "You do not have permission to perform this action",
  "statusCode": 403
}
```

**Tests:**
```javascript
pm.test("Status code is 403", function () {
    pm.response.to.have.status(403);
});

pm.test("Permission denied message", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.message).to.match(/permission/i);
});
```

---

#### 2.1.4 Sync to All Shops - FAILURE (Wrong Organization) ❌

**Endpoint:** `POST {{baseUrl}}/organizations/{{wrongOrganizationId}}/metal-rates/sync`

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "You can only sync rates for your own organization",
  "statusCode": 400
}
```

---

### 2.2 Get Organization Master Rate

#### 2.2.1 Get Organization Rate - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/organizations/{{organizationId}}/metal-rates/current`

**Permission Required:** `super_admin` or `org_admin`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Organization master rate retrieved",
  "data": {
    "_id": "65c4f5e8a1234567890abcde",
    "organizationId": "65c4f5e8a1234567890abc00",
    "rateDate": "2024-02-09T00:00:00.000Z",
    "gold": {
      "gold24K": {
        "buyingRate": 6550,
        "sellingRate": 6600
      }
    },
    "silver": {
      "pure": {
        "buyingRate": 76,
        "sellingRate": 79
      }
    },
    "isCurrent": true
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Organization rate retrieved", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('organizationId');
    pm.expect(data.organizationId).to.eql(pm.collectionVariables.get('organizationId'));
});
```

---

#### 2.2.2 Get Organization Rate - FAILURE (Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/organizations/{{organizationId}}/metal-rates/current`

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "No organization master rate found",
  "statusCode": 404
}
```

---

## Summary

### Total Routes: 11

#### Shop-Level Routes: 9
1. ✅ POST `/api/v1/shops/:shopId/metal-rates` - Create/Update Today's Rate
2. ✅ GET `/api/v1/shops/:shopId/metal-rates/current` - Get Current Rate
3. ✅ GET `/api/v1/shops/:shopId/metal-rates/history` - Get Rate History
4. ✅ GET `/api/v1/shops/:shopId/metal-rates/latest` - Get Latest Rates
5. ✅ GET `/api/v1/shops/:shopId/metal-rates/trends` - Get Trend Chart Data
6. ✅ GET `/api/v1/shops/:shopId/metal-rates/compare` - Compare Rates
7. ✅ GET `/api/v1/shops/:shopId/metal-rates/date/:date` - Get Rate by Date
8. ✅ GET `/api/v1/shops/:shopId/metal-rates/current/purity/:metalType/:purity` - Get Rate for Purity
9. ✅ GET `/api/v1/shops/:shopId/metal-rates/average` - Get Average Rate

#### Organization-Level Routes: 2
10. ✅ POST `/api/v1/organizations/:organizationId/metal-rates/sync` - Multi-Shop Sync
11. ✅ GET `/api/v1/organizations/:organizationId/metal-rates/current` - Get Organization Rate

### Test Coverage

#### Positive Tests (Success ✅): 11
- All routes have success scenarios

#### Negative Tests (Failure ❌): 20+
- Validation errors
- Missing required fields
- Invalid data formats
- Business logic constraints
- Authorization failures
- Permission denials
- Not found errors

### Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| Create/Update Rate | 10 req | 15 min |
| Get Current Rate | 100 req | 1 min |
| Multi-Shop Sync | 5 req | 15 min |

### Response Time Benchmarks
- GET Current Rate (cached): < 200ms
- GET requests: < 500ms
- POST/PATCH: < 1000ms
- Organization Sync: < 3000ms

### How to Use This Collection

1. **Import to Postman:**
   - Create new collection "Metal Rate Management"
   - Set collection variables
   - Copy-paste each request

2. **Configure Variables:**
   ```javascript
   baseUrl: http://localhost:5000/api/v1
   authToken: (Get from login endpoint)
   shopId: (Valid MongoDB ObjectId)
   organizationId: (Valid MongoDB ObjectId)
   ```

3. **Authentication Setup:**
   - Login as different users to test permissions
   - Save JWT tokens for each role
   - Test role-based access control

4. **Run Tests:**
   - Run individual requests
   - Use Collection Runner for batch testing
   - Monitor test results in Console
   - Check response times

5. **Best Practices:**
   - Run success scenarios first
   - Follow test order for dependencies
   - Clear cache between tests
   - Verify database state
   - Test with different user roles

---

**Last Updated:** February 2026  
**API Version:** v1  
**Total Test Scenarios:** 31+ test cases (11 routes with multiple test cases each)
