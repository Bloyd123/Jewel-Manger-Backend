# Metal Rate Management API - Postman Testing Guide

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints require authentication. Add this header to all requests:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. CREATE OR UPDATE TODAY'S RATE

### Endpoint
```
POST /shops/:shopId/metal-rates
```

### Valid Request
**URL:**
```
POST http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Body (Valid):**
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

**Expected Response (201 Created or 200 OK):**
```json
{
  "success": true,
  "message": "Metal rates created successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "shopId": "65f1234567890abcdef12345",
    "rateDate": "2024-11-10T00:00:00.000Z",
    "gold": { ... },
    "silver": { ... },
    "isCurrent": true,
    "isActive": true
  }
}
```

### Invalid Requests

#### 1. Missing Required Fields
**Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800
      // sellingRate missing
    }
  }
}
```
**Expected Error (400):**
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

#### 2. Selling Rate Less Than Buying Rate
**Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": 6800,
      "sellingRate": 6700
    }
  }
}
```
**Expected Error (400):**
```json
{
  "error": "Selling rate cannot be less than buying rate for Gold 24K"
}
```

#### 3. Invalid Weight Unit
**Body:**
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
**Expected Error (400):**
```json
{
  "error": "Weight unit must be: gram, kg, or tola"
}
```

#### 4. Negative Rate Values
**Body:**
```json
{
  "gold": {
    "gold24K": {
      "buyingRate": -6800,
      "sellingRate": 6850
    }
  }
}
```
**Expected Error (400):**
```json
{
  "error": "Gold 24K buying rate must be a positive number"
}
```

---

## 2. GET CURRENT RATE (MOST USED)

### Endpoint
```
GET /shops/:shopId/metal-rates/current
```

### Valid Request
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/current
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Current metal rates",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "shopId": "65f1234567890abcdef12345",
    "rateDate": "2024-11-10T00:00:00.000Z",
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
    "isCurrent": true
  },
  "meta": {
    "cached": true
  }
}
```

### Invalid Requests

#### 1. Invalid Shop ID
**URL:**
```
GET http://localhost:3000/api/v1/shops/invalid-id/metal-rates/current
```
**Expected Error (400):**
```json
{
  "error": "Invalid shop ID format"
}
```

#### 2. Shop Not Found
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f0000000000000000000000/metal-rates/current
```
**Expected Error (404):**
```json
{
  "error": "No current metal rate found. Please update today's rates."
}
```

---

## 3. GET RATE HISTORY

### Endpoint
```
GET /shops/:shopId/metal-rates/history
```

### Valid Requests

#### Without Filters
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history
```

#### With Date Range
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?startDate=2024-11-01&endDate=2024-11-10
```

#### With Pagination
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?page=2&limit=20
```

#### With All Filters
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?startDate=2024-11-01&endDate=2024-11-10&page=1&limit=10&sort=-rateDate
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate history retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "rateDate": "2024-11-10T00:00:00.000Z",
      "gold": { ... },
      "silver": { ... }
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

### Invalid Requests

#### 1. Invalid Date Format
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?startDate=2024/11/01
```
**Expected Error (400):**
```json
{
  "error": "Start date must be a valid date (YYYY-MM-DD)"
}
```

#### 2. End Date Before Start Date
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?startDate=2024-11-10&endDate=2024-11-01
```
**Expected Error (400):**
```json
{
  "error": "End date must be greater than or equal to start date"
}
```

#### 3. Invalid Page Number
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?page=0
```
**Expected Error (400):**
```json
{
  "error": "Page must be a positive integer"
}
```

#### 4. Limit Exceeds Maximum
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/history?limit=150
```
**Expected Error (400):**
```json
{
  "error": "Limit must be between 1 and 100"
}
```

---

## 4. GET RATE BY SPECIFIC DATE

### Endpoint
```
GET /shops/:shopId/metal-rates/date/:date
```

### Valid Request
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/date/2024-11-05
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate for 2024-11-05 retrieved successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "rateDate": "2024-11-05T00:00:00.000Z",
    "gold": { ... }
  }
}
```

### Invalid Requests

#### 1. Invalid Date Format
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/date/05-11-2024
```
**Expected Error (400):**
```json
{
  "error": "Date must be in YYYY-MM-DD format"
}
```

#### 2. Rate Not Found for Date
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/date/2024-01-01
```
**Expected Error (404):**
```json
{
  "error": "No rate found for date: 2024-01-01"
}
```

---

## 5. COMPARE RATES BETWEEN TWO DATES

### Endpoint
```
GET /shops/:shopId/metal-rates/compare
```

### Valid Request
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/compare?fromDate=2024-11-01&toDate=2024-11-10
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate comparison completed",
  "data": {
    "fromDate": "2024-11-01",
    "toDate": "2024-11-10",
    "daysDifference": 9,
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
    "trendComparison": {
      "gold": {
        "ma7Change": 50,
        "ma30Change": 120,
        "ma90Change": 200
      }
    }
  }
}
```

### Invalid Requests

#### 1. Missing Required Parameters
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/compare?fromDate=2024-11-01
```
**Expected Error (400):**
```json
{
  "error": "Both fromDate and toDate are required"
}
```

#### 2. To Date Before From Date
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/compare?fromDate=2024-11-10&toDate=2024-11-01
```
**Expected Error (400):**
```json
{
  "error": "toDate must be greater than or equal to fromDate"
}
```

---

## 6. GET TREND CHART DATA

### Endpoint
```
GET /shops/:shopId/metal-rates/trends
```

### Valid Requests

#### Default (Gold, 90 days)
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/trends
```

#### With Parameters
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/trends?metalType=silver&days=30
```

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
        "date": "2024-08-12",
        "rate": 6800,
        "ma7": 6785,
        "ma30": 6750,
        "ma90": 6700
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

### Invalid Requests

#### 1. Invalid Metal Type
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/trends?metalType=copper
```
**Expected Error (400):**
```json
{
  "error": "Metal type must be: gold, silver, or platinum"
}
```

#### 2. Invalid Days Value
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/trends?days=0
```
**Expected Error (400):**
```json
{
  "error": "Days must be a positive number"
}
```

#### 3. Days Exceeds Maximum
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/trends?days=400
```
**Expected Error (400):**
```json
{
  "error": "Days must be between 1 and 365"
}
```

---

## 7. GET LATEST RATES (RECENT 10)

### Endpoint
```
GET /shops/:shopId/metal-rates/latest
```

### Valid Requests

#### Default (10 rates)
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/latest
```

#### With Custom Limit
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/latest?limit=5
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Latest rates retrieved",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "rateDate": "2024-11-10T00:00:00.000Z",
      "gold": { ... }
    }
  ]
}
```

---

## 8. GET RATE FOR SPECIFIC PURITY

### Endpoint
```
GET /shops/:shopId/metal-rates/current/purity/:metalType/:purity
```

### Valid Requests

#### Gold 22K
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/current/purity/gold/22K
```

#### Silver 925
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/current/purity/silver/925
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Rate for purity retrieved",
  "data": {
    "metalType": "gold",
    "purity": "22K",
    "buyingRate": 6200,
    "sellingRate": 6250,
    "rateDate": "2024-11-10T00:00:00.000Z"
  }
}
```

### Invalid Requests

#### 1. Invalid Metal Type
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/current/purity/copper/99
```
**Expected Error (400):**
```json
{
  "error": "Metal type must be: gold, silver, or platinum"
}
```

#### 2. Invalid Purity for Metal Type
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/current/purity/gold/999
```
**Expected Error (400):**
```json
{
  "error": "Invalid purity for gold. Valid options: 24K, 22K, 20K, 18K, 14K"
}
```

---

## 9. GET AVERAGE RATE (30 DAYS)

### Endpoint
```
GET /shops/:shopId/metal-rates/average
```

### Valid Requests

#### Default (Gold 24K, 30 days)
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/average
```

#### With Parameters
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/average?metalType=silver&purity=999&days=90
```

**Expected Response (200 OK):**
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

### Invalid Requests

#### 1. Invalid Days Value
**URL:**
```
GET http://localhost:3000/api/v1/shops/65f1234567890abcdef12345/metal-rates/average?days=-5
```
**Expected Error (400):**
```json
{
  "error": "Days must be a positive number"
}
```

---

## 10. MULTI-SHOP SYNC (ORGANIZATION LEVEL)

### Endpoint
```
POST /organizations/:organizationId/metal-rates/sync
```

### Valid Request
**URL:**
```
POST http://localhost:3000/api/v1/organizations/65f9999999999999999999999/metal-rates/sync
```

**Headers:**
```
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json
```

**Body:**
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

**Expected Response (200 OK or 207 Multi-Status):**
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

### Invalid Requests

#### 1. Unauthorized User
**Expected Error (403):**
```json
{
  "error": "You can only sync rates for your own organization"
}
```

#### 2. No Active Shops
**Expected Error (404):**
```json
{
  "error": "No active shops found for this organization"
}
```

---

## 11. GET ORGANIZATION MASTER RATE

### Endpoint
```
GET /organizations/:organizationId/metal-rates/current
```

### Valid Request
**URL:**
```
GET http://localhost:3000/api/v1/organizations/65f9999999999999999999999/metal-rates/current
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Organization master rate retrieved",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "organizationId": "65f9999999999999999999999",
    "gold": { ... },
    "silver": { ... }
  }
}
```

---

## 12. DEACTIVATE RATE

### Endpoint
```
PATCH /metal-rates/:rateId/deactivate
```

### Valid Request
**URL:**
```
PATCH http://localhost:3000/api/v1/metal-rates/65f9876543210fedcba98765/deactivate
```

**Expected Response (200 OK):**
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

### Invalid Requests

#### 1. Invalid Rate ID
**URL:**
```
PATCH http://localhost:3000/api/v1/metal-rates/invalid-id/deactivate
```
**Expected Error (400):**
```json
{
  "error": "Invalid rate ID format"
}
```

#### 2. Rate Not Found
**URL:**
```
PATCH http://localhost:3000/api/v1/metal-rates/65f0000000000000000000000/deactivate
```
**Expected Error (404):**
```json
{
  "error": "Metal rate not found"
}
```

---

## 13. SOFT DELETE RATE

### Endpoint
```
DELETE /metal-rates/:rateId
```

### Valid Request
**URL:**
```
DELETE http://localhost:3000/api/v1/metal-rates/65f9876543210fedcba98765
```

**Expected Response (204 No Content)**

### Invalid Requests

#### 1. Cannot Delete Current Rate
**Expected Error (409):**
```json
{
  "error": "Cannot delete current rate. Please create a new rate first."
}
```

#### 2. Rate Not Found
**Expected Error (404):**
```json
{
  "error": "Metal rate not found"
}
```

---

## Postman Collection Setup

### Environment Variables
Create a Postman environment with these variables:

```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "YOUR_JWT_TOKEN",
  "shopId": "65f1234567890abcdef12345",
  "organizationId": "65f9999999999999999999999",
  "rateId": "65f9876543210fedcba98765"
}
```

### Pre-request Script (For Authentication)
Add this to Collection-level pre-request script:

```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('authToken')
});
```

### Tests Script (For Response Validation)
Add this to Collection-level tests:

```javascript
pm.test("Status code is 200 or 201 or 204", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});
```

---

## Testing Checklist

### Authentication Tests
- [ ] Valid token
- [ ] Invalid token
- [ ] Expired token
- [ ] Missing token

### Permission Tests
- [ ] User with canUpdateMetalRates
- [ ] User without canUpdateMetalRates
- [ ] super_admin access
- [ ] org_admin access
- [ ] shop_admin access

### Data Validation Tests
- [ ] All required fields present
- [ ] Missing required fields
- [ ] Invalid data types
- [ ] Negative values
- [ ] Selling rate < Buying rate
- [ ] Invalid enum values
- [ ] String length limits

### Date Tests
- [ ] Valid date formats
- [ ] Invalid date formats
- [ ] Past dates
- [ ] Future dates
- [ ] Date range logic

### Pagination Tests
- [ ] Valid page numbers
- [ ] Invalid page numbers (0, negative)
- [ ] Valid limit values
- [ ] Invalid limit values (>100, 0, negative)

### Edge Cases
- [ ] Empty database
- [ ] Single record
- [ ] Maximum records
- [ ] Concurrent updates
- [ ] Rate limiting

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
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 409 Conflict
```json
{
  "error": "Conflict error message"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Notes

1. **Rate Limiting**: Some endpoints have rate limits. Check the routes file for specific limits.
2. **Caching**: Current rate endpoint is heavily cached (1 hour). Use cache busting if needed.
3. **Permissions**: Different endpoints require different permissions. Refer to the routes file.
4. **MongoDB ObjectIds**: Always use valid 24-character hex strings for IDs.
5. **Date Format**: Always use ISO 8601 format (YYYY-MM-DD).
6. **Decimal Precision**: Rates are stored with 2 decimal places.

---

## Quick Test Scenarios

### Scenario 1: Daily Rate Update Flow
1. POST - Create today's rate
2. GET - Fetch current rate (should be cached)
3. GET - View rate history
4. PATCH - Update today's rate

### Scenario 2: Analysis Flow
1. GET - Compare rates (last 7 days)
2. GET - Get trend data (30 days)
3. GET - Get average rate (30 days)
4. GET - Get rate for specific purity

### Scenario 3: Organization Admin Flow
1. POST - Sync rates to all shops
2. GET - Get organization master rate
3. GET - View each shop's current rate

### Scenario 4: Error Handling
1. Try invalid shop ID
2. Try missing required fields
3. Try invalid date formats
4. Try unauthorized access

---

**Happy Testing! 🚀**
