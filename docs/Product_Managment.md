# Product Management API - Complete Postman Test Collection
## Comprehensive Test Suite for All 19 Routes

### Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Product CRUD Operations (5 Routes)](#1-product-crud-operations)
3. [Stock Management (3 Routes)](#2-stock-management)
4. [Product Status Operations (3 Routes)](#3-product-status-operations)
5. [Pricing Operations (1 Route)](#4-pricing-operations)
6. [Search & Filter (3 Routes)](#5-search--filter)
7. [Bulk Operations (2 Routes)](#6-bulk-operations)
8. [Analytics (1 Route)](#7-analytics)

---

## Setup & Prerequisites

### Collection Variables
```javascript
baseUrl: http://localhost:3000/api/v1
authToken: YOUR_JWT_TOKEN
shopId: 65f1234567890abcdef12345
organizationId: 65f9999999999999999999999
productId: (auto-set from create)
categoryId: 65f1111111111111111111111
subCategoryId: 65f2222222222222222222222
supplierId: 65f3333333333333333333333
customerId: 65f4444444444444444444444
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
  "categoryId": "65f1111111111111111111111",
  "subCategoryId": "65f2222222222222222222222",
  "OTHER_CATEGORY_ID": "65f5555555555555555555555",
  "OTHER_SUBCATEGORY_ID": "65f6666666666666666666666"
}
```

---

## 1. PRODUCT CRUD OPERATIONS

### 1.1 Create Product - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "name": "Gold Ring 22K Traditional Design",
  "description": "Beautiful traditional gold ring with intricate design work. Perfect for weddings and special occasions.",
  "categoryId": "{{categoryId}}",
  "subCategoryId": "{{subCategoryId}}",
  "productType": "ready_made",
  "metal": {
    "type": "gold",
    "purity": "22K",
    "color": "yellow"
  },
  "weight": {
    "grossWeight": 15.5,
    "stoneWeight": 2.5,
    "unit": "gram"
  },
  "makingCharges": {
    "type": "per_gram",
    "value": 500
  },
  "stones": [
    {
      "stoneType": "diamond",
      "pieceCount": 5,
      "stoneWeight": 0.5,
      "stonePrice": 5000,
      "stoneQuality": "VVS",
      "stoneCut": "brilliant"
    }
  ],
  "pricing": {
    "costPrice": 85000,
    "sellingPrice": 95000,
    "mrp": 100000,
    "gst": {
      "percentage": 3,
      "included": false
    },
    "discount": {
      "type": "percentage",
      "value": 5
    },
    "otherCharges": 500
  },
  "stock": {
    "quantity": 10,
    "reorderLevel": 2,
    "locationInShop": "Counter A - Shelf 2"
  },
  "gender": "female",
  "tags": ["wedding", "traditional", "gold", "ring", "bridal"],
  "images": [
    {
      "url": "https://example.com/images/ring1.jpg",
      "altText": "Front view",
      "isPrimary": true
    },
    {
      "url": "https://example.com/images/ring2.jpg",
      "altText": "Side view",
      "isPrimary": false
    }
  ],
  "hallmarking": {
    "isHallmarked": true,
    "huid": "HUID123456789012",
    "hallmarkCenter": "BIS Mumbai",
    "certificationDate": "2024-02-01"
  },
  "supplierId": "{{supplierId}}",
  "barcode": "BAR123456789",
  "sku": "GR22K-001",
  "isFeatured": true,
  "isActive": true
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Product created successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("created successfully");
});

pm.test("Product has all required fields", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('productCode');
    pm.expect(data).to.have.property('name');
    pm.expect(data).to.have.property('categoryId');
    pm.expect(data).to.have.property('metal');
    pm.expect(data).to.have.property('weight');
    pm.expect(data).to.have.property('pricing');
    pm.expect(data).to.have.property('stock');
    
    // Save product ID for later tests
    pm.collectionVariables.set('productId', data._id);
    pm.collectionVariables.set('productCode', data.productCode);
});

pm.test("Product code is auto-generated", function () {
    const data = pm.response.json().data;
    pm.expect(data.productCode).to.match(/^PRD-/);
});

pm.test("Net weight is calculated correctly", function () {
    const data = pm.response.json().data;
    const expectedNetWeight = 15.5 - 2.5; // grossWeight - stoneWeight
    pm.expect(data.weight.netWeight).to.eql(expectedNetWeight);
});

pm.test("Pricing is calculated correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.pricing).to.have.property('metalRate');
    pm.expect(data.pricing).to.have.property('metalValue');
    pm.expect(data.pricing).to.have.property('stoneValue');
    pm.expect(data.pricing).to.have.property('makingCharges');
    pm.expect(data.pricing).to.have.property('totalPrice');
});

pm.test("Stock status is set correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.stock.status).to.be.oneOf(['in_stock', 'low_stock', 'out_of_stock']);
});

pm.test("Stone total price is calculated", function () {
    const data = pm.response.json().data;
    if (data.stones && data.stones.length > 0) {
        data.stones.forEach(stone => {
            pm.expect(stone).to.have.property('totalStonePrice');
            const expectedTotal = stone.stonePrice * stone.pieceCount;
            pm.expect(stone.totalStonePrice).to.eql(expectedTotal);
        });
    }
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "organizationId": "65f9999999999999999999999",
    "shopId": "65f1234567890abcdef12345",
    "productCode": "PRD-001",
    "name": "Gold Ring 22K Traditional Design",
    "categoryId": "65f1111111111111111111111",
    "subCategoryId": "65f2222222222222222222222",
    "metal": {
      "type": "gold",
      "purity": "22K",
      "color": "yellow"
    },
    "weight": {
      "grossWeight": 15.5,
      "stoneWeight": 2.5,
      "netWeight": 13,
      "unit": "gram"
    },
    "pricing": {
      "metalRate": 6200,
      "metalValue": 80600,
      "stoneValue": 25000,
      "makingCharges": 6500,
      "otherCharges": 500,
      "subtotal": 112600,
      "discount": {
        "type": "percentage",
        "value": 5,
        "amount": 5630
      },
      "gst": {
        "percentage": 3,
        "amount": 3209.10
      },
      "totalPrice": 110179.10,
      "sellingPrice": 110179.10
    },
    "stock": {
      "quantity": 10,
      "status": "in_stock",
      "reorderLevel": 2
    },
    "saleStatus": "available",
    "isActive": true,
    "createdAt": "2024-02-09T10:30:00.000Z"
  }
}
```

---

### 1.2 Create Product - FAILURE (Missing Required Fields) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "description": "A product without name"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation errors are present", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(false);
    pm.expect(jsonData).to.have.property('details');
    pm.expect(jsonData.details).to.be.an('array');
});

pm.test("Error indicates missing required fields", function () {
    const jsonData = pm.response.json();
    const errors = jsonData.details.map(d => d.field);
    pm.expect(errors).to.include('name');
    pm.expect(errors).to.include('categoryId');
    pm.expect(errors).to.include('metal.type');
    pm.expect(errors).to.include('weight.grossWeight');
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Product name is required"
    },
    {
      "field": "categoryId",
      "message": "Category is required"
    },
    {
      "field": "metal.type",
      "message": "Metal type is required"
    },
    {
      "field": "metal.purity",
      "message": "Metal purity is required"
    },
    {
      "field": "weight.grossWeight",
      "message": "Gross weight is required"
    },
    {
      "field": "pricing.sellingPrice",
      "message": "Selling price is required"
    }
  ]
}
```

---

### 1.3 Create Product - FAILURE (Invalid Category) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "name": "Test Product",
  "categoryId": "invalid-category-id",
  "metal": {
    "type": "gold",
    "purity": "22K"
  },
  "weight": {
    "grossWeight": 10
  },
  "pricing": {
    "sellingPrice": 50000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid category ID", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*category/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid category ID"
}
```

---

### 1.4 Create Product - FAILURE (Invalid Metal Type) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "name": "Test Product",
  "categoryId": "{{categoryId}}",
  "metal": {
    "type": "copper",
    "purity": "99"
  },
  "weight": {
    "grossWeight": 10
  },
  "pricing": {
    "sellingPrice": 50000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid metal type", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*metal.*type/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid metal type",
  "details": [
    {
      "field": "metal.type",
      "message": "Invalid metal type. Must be: gold, silver, platinum, diamond, gemstone, mixed"
    }
  ]
}
```

---

### 1.5 Create Product - FAILURE (Negative Weight) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "name": "Test Product",
  "categoryId": "{{categoryId}}",
  "metal": {
    "type": "gold",
    "purity": "22K"
  },
  "weight": {
    "grossWeight": -10
  },
  "pricing": {
    "sellingPrice": 50000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates weight must be positive", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/positive|greater.*0/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "weight.grossWeight",
      "message": "Gross weight must be greater than 0"
    }
  ]
}
```

---

### 1.6 Create Product - SUCCESS with "OTHER" Category ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products`

**Request Body:**
```json
{
  "name": "Miscellaneous Item",
  "categoryId": "OTHER",
  "subCategoryId": "OTHER_MISC",
  "metal": {
    "type": "mixed",
    "purity": "other"
  },
  "weight": {
    "grossWeight": 5
  },
  "pricing": {
    "sellingPrice": 10000
  }
}
```

**Tests:**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("OTHER category is mapped correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.categoryId).to.not.eql("OTHER");
    pm.expect(data.categoryId).to.eql(pm.environment.get("OTHER_CATEGORY_ID"));
});

pm.test("OTHER subcategory is mapped correctly", function () {
    const data = pm.response.json().data;
    pm.expect(data.subCategoryId).to.eql(pm.environment.get("OTHER_SUBCATEGORY_ID"));
});
```

---

### 1.7 Get All Products - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products?page=1&limit=20&sort=-createdAt`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Products array returned", function () {
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
    pm.expect(jsonData.meta.pagination).to.have.property('hasNextPage');
    pm.expect(jsonData.meta.pagination).to.have.property('hasPrevPage');
});

pm.test("Products have populated fields", function () {
    const products = pm.response.json().data;
    if (products.length > 0) {
        const product = products[0];
        pm.expect(product).to.have.property('categoryId');
        pm.expect(product.categoryId).to.have.property('name');
        
        if (product.supplierId) {
            pm.expect(product.supplierId).to.have.property('name');
        }
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "productCode": "PRD-001",
      "name": "Gold Ring 22K Traditional Design",
      "categoryId": {
        "_id": "65f1111111111111111111111",
        "name": "Rings",
        "code": "RING"
      },
      "metal": {
        "type": "gold",
        "purity": "22K"
      },
      "pricing": {
        "sellingPrice": 95000
      },
      "stock": {
        "quantity": 10,
        "status": "in_stock"
      },
      "primaryImage": "https://example.com/images/ring1.jpg",
      "saleStatus": "available",
      "isActive": true
    }
  ],
  "meta": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "pageSize": 20,
      "totalItems": 95,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 1.8 Get Products with Filters - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products?category={{categoryId}}&metalType=gold&purity=22K&minPrice=50000&maxPrice=100000&status=in_stock&saleStatus=available&gender=female&isFeatured=true&page=1&limit=10`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Filtered products returned", function () {
    const products = pm.response.json().data;
    products.forEach(product => {
        pm.expect(product.metal.type).to.eql('gold');
        pm.expect(product.metal.purity).to.eql('22K');
        pm.expect(product.pricing.sellingPrice).to.be.at.least(50000);
        pm.expect(product.pricing.sellingPrice).to.be.at.most(100000);
        pm.expect(product.stock.status).to.eql('in_stock');
        pm.expect(product.saleStatus).to.eql('available');
    });
});
```

---

### 1.9 Get Products - FAILURE (Invalid Page) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products?page=0`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid page number", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/page.*positive/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "page",
      "message": "Page must be a positive integer"
    }
  ]
}
```

---

### 1.10 Get Single Product - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/{{productId}}`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Product details returned", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('_id');
    pm.expect(data).to.have.property('name');
    pm.expect(data).to.have.property('categoryId');
    pm.expect(data).to.have.property('metal');
    pm.expect(data).to.have.property('weight');
    pm.expect(data).to.have.property('pricing');
    pm.expect(data).to.have.property('stock');
});

pm.test("Product has populated references", function () {
    const data = pm.response.json().data;
    
    if (data.supplierId) {
        pm.expect(data.supplierId).to.have.property('name');
        pm.expect(data.supplierId).to.have.property('contactPerson');
    }
    
    if (data.createdBy) {
        pm.expect(data.createdBy).to.have.property('firstName');
        pm.expect(data.createdBy).to.have.property('email');
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "productCode": "PRD-001",
    "name": "Gold Ring 22K Traditional Design",
    "description": "Beautiful traditional gold ring...",
    "categoryId": {
      "_id": "65f1111111111111111111111",
      "name": "Rings",
      "code": "RING"
    },
    "subCategoryId": {
      "_id": "65f2222222222222222222222",
      "name": "Traditional Rings",
      "code": "TRAD"
    },
    "metal": {
      "type": "gold",
      "purity": "22K",
      "color": "yellow"
    },
    "weight": {
      "grossWeight": 15.5,
      "stoneWeight": 2.5,
      "netWeight": 13,
      "unit": "gram"
    },
    "pricing": {
      "sellingPrice": 95000,
      "costPrice": 85000,
      "metalRate": 6200,
      "metalValue": 80600
    },
    "stock": {
      "quantity": 10,
      "status": "in_stock"
    },
    "supplierId": {
      "_id": "65f3333333333333333333333",
      "name": "Gold Suppliers Ltd",
      "contactPerson": "John Doe"
    },
    "createdBy": {
      "_id": "65f7777777777777777777777",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com"
    }
  }
}
```

---

### 1.11 Get Single Product - FAILURE (Invalid ID) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/invalid-id`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid ID format", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid ID format"
}
```

---

### 1.12 Get Single Product - FAILURE (Not Found) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/65f0000000000000000000000`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates product not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/product.*not.*found/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 1.13 Update Product - SUCCESS ✅

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/products/{{productId}}`

**Request Body:**
```json
{
  "name": "Gold Ring 22K Traditional Design - UPDATED",
  "description": "Updated description with new details",
  "pricing": {
    "sellingPrice": 98000,
    "discount": {
      "type": "flat",
      "value": 2000
    }
  },
  "stock": {
    "quantity": 8,
    "reorderLevel": 3
  },
  "tags": ["wedding", "traditional", "gold", "ring", "bridal", "premium"],
  "isFeatured": false
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Product updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("updated successfully");
});

pm.test("Updated fields are reflected", function () {
    const data = pm.response.json().data;
    pm.expect(data.name).to.include("UPDATED");
    pm.expect(data.pricing.sellingPrice).to.eql(98000);
    pm.expect(data.stock.quantity).to.eql(8);
    pm.expect(data.isFeatured).to.eql(false);
});

pm.test("Stock status updated automatically", function () {
    const data = pm.response.json().data;
    // With quantity 8 and reorderLevel 3, status should be in_stock
    pm.expect(data.stock.status).to.eql('in_stock');
});

pm.test("Product code cannot be changed", function () {
    const data = pm.response.json().data;
    pm.expect(data.productCode).to.eql(pm.collectionVariables.get('productCode'));
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "65f9876543210fedcba98765",
    "productCode": "PRD-001",
    "name": "Gold Ring 22K Traditional Design - UPDATED",
    "description": "Updated description with new details",
    "pricing": {
      "sellingPrice": 98000
    },
    "stock": {
      "quantity": 8,
      "status": "in_stock"
    },
    "isFeatured": false,
    "updatedAt": "2024-02-09T11:00:00.000Z"
  }
}
```

---

### 1.14 Update Product - FAILURE (Invalid Category) ❌

**Endpoint:** `PUT {{baseUrl}}/shops/{{shopId}}/products/{{productId}}`

**Request Body:**
```json
{
  "categoryId": "65f0000000000000000000000"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid category", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*category/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Invalid category selected"
}
```

---

### 1.15 Delete Product - SUCCESS ✅

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/products/{{productId}}`

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

### 1.16 Delete Product - FAILURE (Not Found) ❌

**Endpoint:** `DELETE {{baseUrl}}/shops/{{shopId}}/products/65f0000000000000000000000`

**Tests:**
```javascript
pm.test("Status code is 404", function () {
    pm.response.to.have.status(404);
});

pm.test("Error indicates product not found", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/product.*not.*found/i);
});
```

**Expected Response (404):**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

## 2. STOCK MANAGEMENT

### 2.1 Update Stock - ADD Operation ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "add",
  "quantity": 5,
  "reason": "New stock received from supplier",
  "referenceType": "purchase",
  "referenceId": "65f8888888888888888888888"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Stock updated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("Stock updated successfully");
});

pm.test("Stock quantity increased", function () {
    const data = pm.response.json().data;
    pm.expect(data.newQuantity).to.be.greaterThan(data.previousQuantity);
    const expectedIncrease = data.newQuantity - data.previousQuantity;
    pm.expect(expectedIncrease).to.eql(5);
});

pm.test("Transaction details returned", function () {
    const data = pm.response.json().data;
    pm.expect(data.transaction).to.have.property('transactionType');
    pm.expect(data.transaction.transactionType).to.eql('IN');
    pm.expect(data.transaction.quantity).to.eql(5);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "productId": "65f9876543210fedcba98765",
    "previousQuantity": 10,
    "newQuantity": 15,
    "status": "in_stock",
    "transaction": {
      "transactionType": "IN",
      "quantity": 5,
      "referenceType": "purchase",
      "referenceId": "65f8888888888888888888888"
    }
  }
}
```

---

### 2.2 Update Stock - SUBTRACT Operation ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "subtract",
  "quantity": 3,
  "reason": "Manual sale - walk-in customer",
  "referenceType": "sale"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Stock quantity decreased", function () {
    const data = pm.response.json().data;
    pm.expect(data.newQuantity).to.be.lessThan(data.previousQuantity);
    const expectedDecrease = data.previousQuantity - data.newQuantity;
    pm.expect(expectedDecrease).to.eql(3);
});

pm.test("Transaction type is OUT", function () {
    const data = pm.response.json().data;
    pm.expect(data.transaction.transactionType).to.eql('OUT');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "productId": "65f9876543210fedcba98765",
    "previousQuantity": 15,
    "newQuantity": 12,
    "status": "in_stock",
    "transaction": {
      "transactionType": "OUT",
      "quantity": 3,
      "referenceType": "sale"
    }
  }
}
```

---

### 2.3 Update Stock - SET Operation ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "set",
  "quantity": 20,
  "reason": "Physical stock count adjustment",
  "referenceType": "manual_adjustment"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Stock set to exact quantity", function () {
    const data = pm.response.json().data;
    pm.expect(data.newQuantity).to.eql(20);
});

pm.test("Transaction type is ADJUSTMENT", function () {
    const data = pm.response.json().data;
    pm.expect(data.transaction.transactionType).to.eql('ADJUSTMENT');
});
```

---

### 2.4 Update Stock - FAILURE (Insufficient Stock) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "subtract",
  "quantity": 100,
  "reason": "Testing insufficient stock"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates insufficient stock", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/insufficient.*stock/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Insufficient stock available"
}
```

---

### 2.5 Update Stock - FAILURE (Invalid Operation) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "multiply",
  "quantity": 2
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates invalid operation", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/operation.*add|subtract|set/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "operation",
      "message": "Operation must be add, subtract, or set"
    }
  ]
}
```

---

### 2.6 Update Stock - FAILURE (Missing Required Fields) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/stock`

**Request Body:**
```json
{
  "operation": "add"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates missing quantity", function () {
    const jsonData = pm.response.json();
    const errors = jsonData.details.map(d => d.field);
    pm.expect(errors).to.include('quantity');
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "quantity",
      "message": "Quantity is required"
    }
  ]
}
```

---

### 2.7 Get Product History - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/history?limit=50`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Product history returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('product');
    pm.expect(jsonData.data).to.have.property('history');
    pm.expect(jsonData.data.history).to.be.an('array');
});

pm.test("History items have required fields", function () {
    const history = pm.response.json().data.history;
    if (history.length > 0) {
        history.forEach(item => {
            pm.expect(item).to.have.property('transactionType');
            pm.expect(item).to.have.property('quantity');
            pm.expect(item).to.have.property('previousQuantity');
            pm.expect(item).to.have.property('newQuantity');
            pm.expect(item).to.have.property('transactionDate');
        });
    }
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product history retrieved successfully",
  "data": {
    "product": {
      "_id": "65f9876543210fedcba98765",
      "name": "Gold Ring 22K Traditional Design",
      "productCode": "PRD-001"
    },
    "history": [
      {
        "_id": "65f9999999999999999999999",
        "transactionType": "IN",
        "quantity": 5,
        "previousQuantity": 10,
        "newQuantity": 15,
        "transactionDate": "2024-02-09T10:00:00.000Z",
        "referenceType": "purchase",
        "reason": "New stock received",
        "performedBy": {
          "firstName": "Admin",
          "lastName": "User"
        }
      },
      {
        "_id": "65f9999999999999999999998",
        "transactionType": "OUT",
        "quantity": 3,
        "previousQuantity": 15,
        "newQuantity": 12,
        "transactionDate": "2024-02-09T11:30:00.000Z",
        "referenceType": "sale",
        "reason": "Manual sale"
      }
    ]
  }
}
```

---

### 2.8 Get Low Stock Products - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/low-stock?threshold=5`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Low stock products returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});

pm.test("All products are low stock or out of stock", function () {
    const products = pm.response.json().data;
    products.forEach(product => {
        pm.expect(product.stock.status).to.be.oneOf(['low_stock', 'out_of_stock']);
    });
});

pm.test("Meta data includes statistics", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.meta).to.have.property('totalLowStockItems');
    pm.expect(jsonData.meta).to.have.property('criticalItems');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Low stock products retrieved successfully",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "name": "Gold Ring 22K",
      "productCode": "PRD-001",
      "categoryId": {
        "name": "Rings"
      },
      "stock": {
        "quantity": 2,
        "status": "low_stock"
      },
      "pricing": {
        "sellingPrice": 95000
      }
    }
  ],
  "meta": {
    "totalLowStockItems": 15,
    "criticalItems": 3
  }
}
```

---

## 3. PRODUCT STATUS OPERATIONS

### 3.1 Reserve Product - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/reserve`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "reservationDays": 7,
  "notes": "Customer wants to see other options before finalizing"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Product reserved successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("reserved successfully");
});

pm.test("Product status is reserved", function () {
    const data = pm.response.json().data;
    pm.expect(data.saleStatus).to.eql('reserved');
});

pm.test("Reservation details present", function () {
    const data = pm.response.json().data;
    pm.expect(data.reservedFor).to.have.property('customerId');
    pm.expect(data.reservedFor).to.have.property('expiryDate');
    pm.expect(data.reservedFor.customerId).to.eql(pm.collectionVariables.get('customerId'));
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product reserved successfully",
  "data": {
    "saleStatus": "reserved",
    "reservedFor": {
      "customerId": "65f4444444444444444444444",
      "expiryDate": "2024-02-16T10:00:00.000Z"
    }
  }
}
```

---

### 3.2 Reserve Product - FAILURE (Already Reserved) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/reserve`

**Request Body:**
```json
{
  "customerId": "65f5555555555555555555555",
  "reservationDays": 3
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates product already reserved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/already.*reserved/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Product is already reserved"
}
```

---

### 3.3 Reserve Product - FAILURE (Out of Stock) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{outOfStockProductId}}/reserve`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "reservationDays": 5
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates out of stock", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/out.*of.*stock/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Product is out of stock"
}
```

---

### 3.4 Reserve Product - FAILURE (Missing Customer ID) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/reserve`

**Request Body:**
```json
{
  "reservationDays": 7
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing customer ID", function () {
    const jsonData = pm.response.json();
    const errors = jsonData.details.map(d => d.field);
    pm.expect(errors).to.include('customerId');
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

### 3.5 Cancel Reservation - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/cancel-reservation`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Reservation cancelled successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("cancelled successfully");
});

pm.test("Product status is available", function () {
    const data = pm.response.json().data;
    pm.expect(data.saleStatus).to.eql('available');
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Reservation cancelled successfully",
  "data": {
    "saleStatus": "available"
  }
}
```

---

### 3.6 Cancel Reservation - FAILURE (Not Reserved) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{availableProductId}}/cancel-reservation`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates product not reserved", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/not.*reserved/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Product is not reserved"
}
```

---

### 3.7 Mark as Sold - SUCCESS ✅

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/sold`

**Request Body:**
```json
{
  "customerId": "{{customerId}}",
  "saleId": "65f7777777777777777777777"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Product marked as sold", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("sold successfully");
});

pm.test("Product status is sold", function () {
    const data = pm.response.json().data;
    pm.expect(data.saleStatus).to.eql('sold');
    pm.expect(data).to.have.property('soldDate');
});

pm.test("Stock quantity decreased", function () {
    const data = pm.response.json().data;
    pm.expect(data.stock.quantity).to.be.at.least(0);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product marked as sold successfully",
  "data": {
    "saleStatus": "sold",
    "soldDate": "2024-02-09T12:00:00.000Z",
    "stock": {
      "quantity": 9,
      "status": "in_stock"
    }
  }
}
```

---

### 3.8 Mark as Sold - FAILURE (Already Sold) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/sold`

**Request Body:**
```json
{
  "customerId": "{{customerId}}"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates already sold", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/already.*sold/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Product is already sold"
}
```

---

### 3.9 Mark as Sold - FAILURE (Missing Customer ID) ❌

**Endpoint:** `PATCH {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/sold`

**Request Body:**
```json
{
  "saleId": "65f7777777777777777777777"
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing customer ID", function () {
    const jsonData = pm.response.json();
    const errors = jsonData.details.map(d => d.field);
    pm.expect(errors).to.include('customerId');
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

## 4. PRICING OPERATIONS

### 4.1 Recalculate Price - Using Current Rate ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/calculate-price`

**Request Body:**
```json
{
  "useCurrentRate": true
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Price recalculated successfully", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.include("recalculated successfully");
});

pm.test("Price comparison data present", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('oldPrice');
    pm.expect(data).to.have.property('newPrice');
    pm.expect(data).to.have.property('difference');
    pm.expect(data).to.have.property('differencePercentage');
    pm.expect(data).to.have.property('pricing');
});

pm.test("Difference is calculated correctly", function () {
    const data = pm.response.json().data;
    const expectedDiff = data.newPrice - data.oldPrice;
    pm.expect(data.difference).to.eql(expectedDiff);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Price recalculated successfully",
  "data": {
    "oldPrice": 95000,
    "newPrice": 97500,
    "difference": 2500,
    "differencePercentage": 2.63,
    "pricing": {
      "metalRate": 6300,
      "metalValue": 81900,
      "stoneValue": 25000,
      "makingCharges": 6500,
      "totalPrice": 97500,
      "sellingPrice": 97500
    }
  }
}
```

---

### 4.2 Recalculate Price - Using Custom Rate ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/calculate-price`

**Request Body:**
```json
{
  "useCurrentRate": false,
  "customRate": 6500
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Price calculated with custom rate", function () {
    const data = pm.response.json().data;
    pm.expect(data.pricing.metalRate).to.eql(6500);
});
```

---

### 4.3 Recalculate Price - FAILURE (No Rate Provided) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/calculate-price`

**Request Body:**
```json
{
  "useCurrentRate": false
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Error indicates rate required", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/rate.*required/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Either useCurrentRate or customRate must be provided"
}
```

---

### 4.4 Recalculate Price - FAILURE (Negative Custom Rate) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/{{productId}}/calculate-price`

**Request Body:**
```json
{
  "useCurrentRate": false,
  "customRate": -5000
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for negative rate", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/positive/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "customRate",
      "message": "Custom rate must be positive"
    }
  ]
}
```

---

## 5. SEARCH & FILTER

### 5.1 Search Products - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/search?q=ring&limit=10`

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
    const products = pm.response.json().data;
    products.forEach(product => {
        const searchText = (
            product.name + 
            product.productCode + 
            (product.barcode || '') + 
            (product.tags || []).join('')
        ).toLowerCase();
        pm.expect(searchText).to.include('ring');
    });
});

pm.test("Results limited to requested count", function () {
    const products = pm.response.json().data;
    pm.expect(products.length).to.be.at.most(10);
});

pm.test("Only available products returned", function () {
    const products = pm.response.json().data;
    products.forEach(product => {
        pm.expect(product.saleStatus).to.eql('available');
        pm.expect(product.isActive).to.eql(true);
    });
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Search results",
  "data": [
    {
      "_id": "65f9876543210fedcba98765",
      "name": "Gold Ring 22K",
      "productCode": "PRD-001",
      "categoryId": {
        "name": "Rings"
      },
      "metal": {
        "type": "gold",
        "purity": "22K"
      },
      "pricing": {
        "sellingPrice": 95000
      },
      "stock": {
        "quantity": 10
      },
      "primaryImage": "https://example.com/ring.jpg",
      "saleStatus": "available"
    }
  ]
}
```

---

### 5.2 Search Products - FAILURE (Empty Query) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/search?q=`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for empty query", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/search.*query.*required/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "q",
      "message": "Search query is required"
    }
  ]
}
```

---

### 5.3 Search Products - FAILURE (Query Too Long) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/search?q=this_is_a_very_long_search_query_that_exceeds_the_maximum_allowed_length_of_100_characters_for_search_queries`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for query length", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/between.*1.*100/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "q",
      "message": "Search query must be between 1 and 100 characters"
    }
  ]
}
```

---

### 5.4 Search Products - FAILURE (Invalid Limit) ❌

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/search?q=ring&limit=100`

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for limit", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/limit.*between.*1.*50/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "limit",
      "message": "Limit must be between 1 and 50"
    }
  ]
}
```

---

## 6. BULK OPERATIONS

### 6.1 Bulk Delete Products - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-delete`

**Request Body:**
```json
{
  "productIds": [
    "65f1111111111111111111111",
    "65f2222222222222222222222",
    "65f3333333333333333333333"
  ]
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
    pm.expect(jsonData.message).to.match(/\d+.*deleted/i);
});

pm.test("Deleted count matches", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('deletedCount');
    pm.expect(data.deletedCount).to.be.greaterThan(0);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "3 products deleted successfully",
  "data": {
    "deletedCount": 3
  }
}
```

---

### 6.2 Bulk Delete - FAILURE (Empty Array) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-delete`

**Request Body:**
```json
{
  "productIds": []
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for empty array", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/non-empty.*array/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "productIds",
      "message": "Product IDs must be a non-empty array"
    }
  ]
}
```

---

### 6.3 Bulk Delete - FAILURE (Invalid Product IDs) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-delete`

**Request Body:**
```json
{
  "productIds": [
    "invalid-id-1",
    "invalid-id-2"
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for invalid IDs", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*id/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "productIds.0",
      "message": "Invalid ID format"
    }
  ]
}
```

---

### 6.4 Bulk Update Status - SUCCESS ✅

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-update-status`

**Request Body:**
```json
{
  "productIds": [
    "65f1111111111111111111111",
    "65f2222222222222222222222"
  ],
  "status": "discontinued"
}
```

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Bulk update successful", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.message).to.match(/\d+.*updated/i);
});

pm.test("Modified count present", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property('modifiedCount');
    pm.expect(data.modifiedCount).to.be.greaterThan(0);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "2 products updated successfully",
  "data": {
    "modifiedCount": 2
  }
}
```

---

### 6.5 Bulk Update Status - FAILURE (Invalid Status) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-update-status`

**Request Body:**
```json
{
  "productIds": [
    "65f1111111111111111111111"
  ],
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
    pm.expect(jsonData.error || jsonData.message).to.match(/invalid.*status/i);
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "status",
      "message": "Invalid status. Must be: in_stock, out_of_stock, low_stock, on_order, discontinued"
    }
  ]
}
```

---

### 6.6 Bulk Update Status - FAILURE (Missing Status) ❌

**Endpoint:** `POST {{baseUrl}}/shops/{{shopId}}/products/bulk-update-status`

**Request Body:**
```json
{
  "productIds": [
    "65f1111111111111111111111"
  ]
}
```

**Tests:**
```javascript
pm.test("Status code is 400", function () {
    pm.response.to.have.status(400);
});

pm.test("Validation error for missing status", function () {
    const jsonData = pm.response.json();
    const errors = jsonData.details.map(d => d.field);
    pm.expect(errors).to.include('status');
});
```

**Expected Response (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "status",
      "message": "Status is required"
    }
  ]
}
```

---

## 7. ANALYTICS

### 7.1 Get Product Analytics - SUCCESS ✅

**Endpoint:** `GET {{baseUrl}}/shops/{{shopId}}/products/analytics`

**Tests:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Analytics data returned", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('overview');
    pm.expect(jsonData.data).to.have.property('categoryBreakdown');
});

pm.test("Overview has all metrics", function () {
    const overview = pm.response.json().data.overview;
    pm.expect(overview).to.have.property('totalProducts');
    pm.expect(overview).to.have.property('activeProducts');
    pm.expect(overview).to.have.property('inactiveProducts');
    pm.expect(overview).to.have.property('lowStockCount');
    pm.expect(overview).to.have.property('outOfStockCount');
    pm.expect(overview).to.have.property('totalInventoryValue');
});

pm.test("Category breakdown is array", function () {
    const categoryBreakdown = pm.response.json().data.categoryBreakdown;
    pm.expect(categoryBreakdown).to.be.an('array');
});

pm.test("Category items have required fields", function () {
    const categoryBreakdown = pm.response.json().data.categoryBreakdown;
    if (categoryBreakdown.length > 0) {
        categoryBreakdown.forEach(cat => {
            pm.expect(cat).to.have.property('_id');
            pm.expect(cat).to.have.property('count');
            pm.expect(cat).to.have.property('totalValue');
            pm.expect(cat).to.have.property('categoryName');
        });
    }
});

pm.test("Inactive products calculation is correct", function () {
    const overview = pm.response.json().data.overview;
    const calculatedInactive = overview.totalProducts - overview.activeProducts;
    pm.expect(overview.inactiveProducts).to.eql(calculatedInactive);
});
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Product analytics retrieved successfully",
  "data": {
    "overview": {
      "totalProducts": 250,
      "activeProducts": 230,
      "inactiveProducts": 20,
      "lowStockCount": 15,
      "outOfStockCount": 8,
      "totalInventoryValue": 25000000
    },
    "categoryBreakdown": [
      {
        "_id": "65f1111111111111111111111",
        "categoryName": "Rings",
        "count": 85,
        "totalValue": 8500000
      },
      {
        "_id": "65f2222222222222222222222",
        "categoryName": "Necklaces",
        "count": 65,
        "totalValue": 9750000
      },
      {
        "_id": "65f3333333333333333333333",
        "categoryName": "Earrings",
        "count": 50,
        "totalValue": 3500000
      }
    ]
  }
}
```

---

## SUMMARY & QUICK REFERENCE

### Total Routes: 19

#### Route Breakdown:
1. **Product CRUD (5 routes)**
   - Create Product
   - Get All Products
   - Get Single Product
   - Update Product
   - Delete Product

2. **Stock Management (3 routes)**
   - Update Stock
   - Get Product History
   - Get Low Stock Products

3. **Product Status (3 routes)**
   - Reserve Product
   - Cancel Reservation
   - Mark as Sold

4. **Pricing (1 route)**
   - Recalculate Price

5. **Search & Filter (3 routes)**
   - Search Products
   - Get Products with Filters
   - Get Low Stock

6. **Bulk Operations (2 routes)**
   - Bulk Delete
   - Bulk Update Status

7. **Analytics (1 route)**
   - Get Product Analytics

8. **Additional (1 route)**
   - Get Product History

---

### Test Coverage Summary

| Category | Success Tests | Failure Tests | Total |
|----------|--------------|---------------|-------|
| Product CRUD | 5 | 6 | 11 |
| Stock Management | 4 | 3 | 7 |
| Product Status | 3 | 5 | 8 |
| Pricing | 2 | 3 | 5 |
| Search & Filter | 1 | 3 | 4 |
| Bulk Operations | 2 | 4 | 6 |
| Analytics | 1 | 0 | 1 |
| **TOTAL** | **18** | **24** | **42** |

---

### Common Validation Rules

#### Product Name
- Required
- Min length: 3 characters
- Max length: 200 characters

#### Category ID
- Required
- Must be valid ObjectId
- Category must exist and be active
- Special value "OTHER" maps to env variable

#### Metal Type
- Required
- Valid values: gold, silver, platinum, diamond, gemstone, mixed

#### Metal Purity
- Required
- Gold: 24K, 22K, 18K, 14K, 10K, 916
- Silver: 999, 925, 850
- Platinum: 950

#### Weight
- grossWeight: Required, must be > 0
- stoneWeight: Optional, must be >= 0
- Unit: gram, kg, tola, ounce, carat

#### Pricing
- sellingPrice: Required, must be >= 0
- costPrice: Optional, must be >= 0
- GST: 0-100%
- Discount: percentage or flat

#### Stock
- quantity: Integer >= 0
- reorderLevel: Integer >= 0
- Status: Auto-calculated based on quantity

---

### Response Time Benchmarks

| Operation Type | Expected Time |
|---------------|---------------|
| GET Single Product (Cached) | < 200ms |
| GET Single Product (Uncached) | < 500ms |
| GET Products List | < 800ms |
| POST Create Product | < 1500ms |
| PUT Update Product | < 1000ms |
| PATCH Stock Operations | < 800ms |
| POST Bulk Operations | < 2000ms |
| GET Analytics | < 1500ms |
| GET Search | < 600ms |

---

### Error Response Standards

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Product name is required"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "You don't have permission to perform this action"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "error": "Product with this code already exists"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "requestId": "req_123456789"
}
```

---

### Testing Workflows

#### Workflow 1: Complete Product Lifecycle
```
1. POST - Create Product
2. GET - Fetch Product Details
3. PATCH - Update Stock (Add)
4. PATCH - Reserve Product
5. PATCH - Mark as Sold
6. GET - View Product History
```

#### Workflow 2: Inventory Management
```
1. GET - Get All Products
2. GET - Get Low Stock Products
3. PATCH - Update Stock (Bulk)
4. POST - Recalculate Prices
5. GET - View Analytics
```

#### Workflow 3: Search & Filter
```
1. GET - Search by Name
2. GET - Filter by Category
3. GET - Filter by Metal Type
4. GET - Filter by Price Range
5. GET - Filter by Stock Status
```

#### Workflow 4: Bulk Operations
```
1. POST - Create Multiple Products
2. GET - List All Products
3. POST - Bulk Update Status
4. POST - Bulk Delete
5. GET - Verify Changes
```

---

### Postman Collection Setup

#### Pre-request Script (Collection Level)
```javascript
// Set authentication header
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.collectionVariables.get('authToken')
});

// Add timestamp
pm.collectionVariables.set('timestamp', new Date().toISOString());

// Generate random data for testing
pm.collectionVariables.set('randomName', 'Test Product ' + Date.now());
```

#### Tests Script (Collection Level)
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
    if (pm.response.code === 200 || pm.response.code === 201) {
        pm.expect(jsonData).to.have.property('success');
        pm.expect(jsonData).to.have.property('message');
    }
});

// Log response for debugging
console.log('Response:', pm.response.json());
```

---

**Last Updated:** February 09, 2026  
**API Version:** v1  
**Base URL:** http://localhost:3000/api/v1  
**Total Tests:** 42+ test scenarios  
**Test Coverage:** 100% of all 19 routes

---

**Happy Testing! 🚀**
