# JEWELRY SHOP - PRODUCT API POSTMAN TESTS

## BASE URL
```
http://localhost:5000/api/v1
```

## HEADERS (All Requests)
```
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json
```

---

## 1️⃣ CREATE PRODUCT

### ✅ VALID TEST CASES

#### Test 1.1: Create Basic Gold Ring (22K)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Golden Wedding Ring 22K
description: Beautiful traditional gold ring perfect for weddings
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
subCategoryId: 674a1b2c3d4e5f6g7h8i9j0l
productType: ready_made
metal:
  type: gold
  purity: 22K
  color: yellow
weight:
  grossWeight: 15.5
  stoneWeight: 0.5
  unit: gram
makingCharges:
  type: per_gram
  value: 500
pricing:
  sellingPrice: 95000
  gst:
    percentage: 3
  discount:
    type: none
    value: 0
stock:
  quantity: 5
  reorderLevel: 2
gender: unisex
tags: ["wedding", "gold", "ring", "traditional"]
hallmarking:
  isHallmarked: true
  huid: HM123456789
```

**Expected Response:** `201 Created`
```
success: true
message: Product created successfully
data:
  _id: (auto-generated)
  productCode: PRD000001
  name: Golden Wedding Ring 22K
  metal:
    type: gold
    purity: 22K
  weight:
    netWeight: 15.0 (auto-calculated)
  pricing:
    metalValue: (auto-calculated)
    totalPrice: (auto-calculated)
  stock:
    quantity: 5
    status: in_stock
  saleStatus: available
  isActive: true
```

---

#### Test 1.2: Create Silver Necklace with Multiple Stones
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Silver Diamond Necklace
description: Elegant silver necklace with diamond stones
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
productType: ready_made
metal:
  type: silver
  purity: 925
  color: white
weight:
  grossWeight: 45.8
  stoneWeight: 2.5
  unit: gram
stones:
  - stoneType: diamond
    stoneName: Round Brilliant
    stoneQuality: VS
    stoneColor: White
    stoneShape: round
    caratWeight: 0.5
    pieceCount: 12
    stonePrice: 5000
  - stoneType: pearl
    stoneName: White Pearl
    stoneQuality: AAA
    pieceCount: 8
    stonePrice: 800
makingCharges:
  type: flat
  value: 15000
pricing:
  sellingPrice: 125000
  costPrice: 95000
  mrp: 140000
  gst:
    percentage: 3
  discount:
    type: percentage
    value: 10
stock:
  quantity: 3
  reorderLevel: 1
gender: female
occasion: ["wedding", "party", "bridal"]
tags: ["silver", "diamond", "necklace", "bridal"]
```

**Expected Response:** `201 Created`

---

#### Test 1.3: Create Platinum Bracelet (Making Charges - Percentage)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Platinum Designer Bracelet
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: platinum
  purity: 950
weight:
  grossWeight: 28.5
  stoneWeight: 0
  unit: gram
makingCharges:
  type: percentage
  value: 15
pricing:
  sellingPrice: 185000
stock:
  quantity: 2
  reorderLevel: 1
gender: unisex
```

**Expected Response:** `201 Created`

---

#### Test 1.4: Create Custom Made Engagement Ring
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Custom Diamond Engagement Ring
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
productType: custom_made
metal:
  type: gold
  purity: 18K
  color: white
weight:
  grossWeight: 8.2
  stoneWeight: 0.8
stones:
  - stoneType: diamond
    stoneQuality: VVS
    caratWeight: 1.5
    pieceCount: 1
    stonePrice: 250000
makingCharges:
  type: flat
  value: 25000
pricing:
  sellingPrice: 350000
stock:
  quantity: 1
gender: female
occasion: ["engagement", "wedding"]
```

**Expected Response:** `201 Created`

---

#### Test 1.5: Create Product with "OTHER" Category
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Miscellaneous Gold Item
categoryId: OTHER
subCategoryId: OTHER_MISC
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10.5
  stoneWeight: 0
makingCharges:
  type: per_gram
  value: 400
pricing:
  sellingPrice: 65000
stock:
  quantity: 1
```

**Expected Response:** `201 Created` (categoryId and subCategoryId auto-mapped to env variables)

---

### ❌ INVALID TEST CASES

#### Test 1.6: Missing Required Field - Name
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
description: Missing name field
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
success: false
errors:
  - field: name
    message: Product name is required
```

---

#### Test 1.7: Invalid Category ID
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: invalid_id_format
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: categoryId
    message: Invalid ID format
```

---

#### Test 1.8: Invalid Metal Type
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: copper
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: metal.type
    message: Invalid metal type
```

---

#### Test 1.9: Negative Gross Weight
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: -10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: weight.grossWeight
    message: Gross weight must be greater than 0
```

---

#### Test 1.10: Invalid Purity Value
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 26K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: metal.purity
    message: Invalid purity
```

---

#### Test 1.11: Negative Selling Price
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: -5000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: pricing.sellingPrice
    message: Selling price must be a positive number
```

---

#### Test 1.12: Invalid GST Percentage (> 100)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
  gst:
    percentage: 150
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: pricing.gst.percentage
    message: GST percentage must be between 0 and 100
```

---

#### Test 1.13: Invalid Making Charges Type
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
makingCharges:
  type: invalid_type
  value: 500
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: makingCharges.type
    message: Invalid making charges type
```

---

#### Test 1.14: Invalid Gender
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
gender: transgender
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: gender
    message: Invalid gender
```

---

#### Test 1.15: Invalid Stone Type
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
  stoneWeight: 1
stones:
  - stoneType: quartz
    pieceCount: 5
    stonePrice: 1000
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: stones.*.stoneType
    message: Invalid stone type
```

---

#### Test 1.16: Name Too Short (< 3 characters)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: AB
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: name
    message: Product name must be between 3 and 200 characters
```

---

#### Test 1.17: Description Too Long (> 2000 characters)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
description: (2001+ character long text)
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: description
    message: Description cannot exceed 2000 characters
```

---

#### Test 1.18: Invalid Product Type
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
productType: wholesale
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: productType
    message: Invalid product type
```

---

#### Test 1.19: Negative Stone Price
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
  stoneWeight: 1
stones:
  - stoneType: diamond
    pieceCount: 5
    stonePrice: -1000
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: stones.*.stonePrice
    message: Stone price must be positive
```

---

#### Test 1.20: No Metal Rates Available
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: Test Product
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
metal:
  type: gold
  purity: 22K
weight:
  grossWeight: 10
pricing:
  sellingPrice: 50000
```

**Expected Response:** `400 Bad Request` (if metal rates not set for shop)
```
success: false
message: Metal rates not found for this shop. Please set metal rates first.
```

---

## 2️⃣ GET ALL PRODUCTS

### ✅ VALID TEST CASES

#### Test 2.1: Get All Products (No Filters)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products`  

**Expected Response:** `200 OK`
```
success: true
data: [array of products]
pagination:
  currentPage: 1
  totalPages: 5
  pageSize: 20
  totalItems: 95
  hasNextPage: true
  hasPrevPage: false
```

---

#### Test 2.2: Get Products with Pagination
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?page=2&limit=10`  

**Expected Response:** `200 OK`
```
pagination:
  currentPage: 2
  pageSize: 10
  hasNextPage: true
  hasPrevPage: true
```

---

#### Test 2.3: Filter by Category
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?category=674a1b2c3d4e5f6g7h8i9j0k`  

**Expected Response:** `200 OK` (only products with matching categoryId)

---

#### Test 2.4: Filter by Metal Type
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?metalType=gold`  

**Expected Response:** `200 OK` (only gold products)

---

#### Test 2.5: Filter by Purity
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?purity=22K`  

**Expected Response:** `200 OK` (only 22K products)

---

#### Test 2.6: Filter by Price Range
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?minPrice=50000&maxPrice=100000`  

**Expected Response:** `200 OK` (products between 50k-100k)

---

#### Test 2.7: Search Products
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?search=ring`  

**Expected Response:** `200 OK` (products matching "ring" in name, code, barcode, huid, tags)

---

#### Test 2.8: Filter by Gender
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?gender=female`  

**Expected Response:** `200 OK` (only female products)

---

#### Test 2.9: Filter by Sale Status
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?saleStatus=available`  

**Expected Response:** `200 OK` (only available products)

---

#### Test 2.10: Sort by Price (Descending)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?sort=-pricing.sellingPrice`  

**Expected Response:** `200 OK` (products sorted by price, highest first)

---

#### Test 2.11: Multiple Filters Combined
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?metalType=gold&purity=22K&gender=female&minPrice=50000&maxPrice=150000&page=1&limit=5`  

**Expected Response:** `200 OK` (products matching all filters)

---

#### Test 2.12: Filter by Active Status
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?isActive=true`  

**Expected Response:** `200 OK` (only active products)

---

#### Test 2.13: Filter by Featured
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?isFeatured=true`  

**Expected Response:** `200 OK` (only featured products)

---

### ❌ INVALID TEST CASES

#### Test 2.14: Invalid Page Number (0)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?page=0`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: page
    message: Page must be a positive integer
```

---

#### Test 2.15: Invalid Limit (> 100)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?limit=150`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: limit
    message: Limit must be between 1 and 100
```

---

#### Test 2.16: Invalid Category ID Format
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?category=invalid_id`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: category
    message: Invalid category ID
```

---

#### Test 2.17: Invalid Metal Type
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?metalType=copper`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: metalType
    message: Invalid metal type
```

---

#### Test 2.18: Negative Min Price
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?minPrice=-1000`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: minPrice
    message: Min price must be positive
```

---

#### Test 2.19: Empty Search Query
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?search=`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: search
    message: Search query cannot be empty
```

---

## 3️⃣ GET SINGLE PRODUCT

### ✅ VALID TEST CASES

#### Test 3.1: Get Product by Valid ID
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/:id`  

**Expected Response:** `200 OK`
```
success: true
data:
  _id: 674a1b2c3d4e5f6g7h8i9j0k
  productCode: PRD000001
  name: Golden Wedding Ring
  ... (full product details)
  categoryId:
    _id: ...
    name: Rings
    code: RING
  subCategoryId:
    _id: ...
    name: Wedding Rings
  supplierId:
    _id: ...
    name: ABC Suppliers
```

---

### ❌ INVALID TEST CASES

#### Test 3.2: Invalid Product ID Format
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/invalid_id`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: id
    message: Invalid ID format
```

---

#### Test 3.3: Product Not Found
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/674a1b2c3d4e5f6g7h8i9999`  

**Expected Response:** `404 Not Found`
```
success: false
message: Product not found
```

---

#### Test 3.4: Product from Different Shop
**Method:** `GET`  
**Endpoint:** `/shops/different_shop_id/products/674a1b2c3d4e5f6g7h8i9j0k`  

**Expected Response:** `404 Not Found` or `403 Forbidden`

---

## 4️⃣ UPDATE PRODUCT

### ✅ VALID TEST CASES

#### Test 4.1: Update Product Name
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
name: Updated Gold Ring Name
```

**Expected Response:** `200 OK`
```
success: true
message: Product updated successfully
data:
  name: Updated Gold Ring Name
  updatedAt: (new timestamp)
```

---

#### Test 4.2: Update Weight (Auto-recalculates Price)
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
weight:
  grossWeight: 18.5
  stoneWeight: 0.8
```

**Expected Response:** `200 OK`
```
data:
  weight:
    netWeight: 17.7 (auto-calculated)
  pricing:
    metalValue: (recalculated)
    totalPrice: (recalculated)
```

---

#### Test 4.3: Update Stock Quantity
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
stock:
  quantity: 10
```

**Expected Response:** `200 OK`
```
data:
  stock:
    quantity: 10
    status: in_stock
```

---

#### Test 4.4: Update to Low Stock
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
stock:
  quantity: 2
  reorderLevel: 5
```

**Expected Response:** `200 OK`
```
data:
  stock:
    quantity: 2
    status: low_stock (auto-set)
```

---

#### Test 4.5: Update Category
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
categoryId: 674a1b2c3d4e5f6g7h8i9NEW
subCategoryId: 674a1b2c3d4e5f6g7h8i9SUB
```

**Expected Response:** `200 OK`

---

#### Test 4.6: Update Making Charges
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
makingCharges:
  type: percentage
  value: 12
```

**Expected Response:** `200 OK` (pricing recalculated)

---

#### Test 4.7: Update Description
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
description: Updated product description with more details
```

**Expected Response:** `200 OK`

---

#### Test 4.8: Update isActive Status
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
isActive: false
```

**Expected Response:** `200 OK`

---

### ❌ INVALID TEST CASES

#### Test 4.9: Try to Update productCode (Should be Ignored)
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
productCode: PRD999999
name: Test Update
```

**Expected Response:** `200 OK` (productCode unchanged)

---

#### Test 4.10: Invalid Category ID
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
categoryId: invalid_category_id
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: categoryId
    message: Invalid category ID
```

---

#### Test 4.11: Update with Negative Weight
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
weight:
  grossWeight: -5
```

**Expected Response:** `400 Bad Request`

---

#### Test 4.12: Update Non-Existent Product
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/674a1b2c3d4e5f6g7h8i9999`  
**Body:**
```
name: Test
```

**Expected Response:** `404 Not Found`

---

#### Test 4.13: Invalid Selling Price
**Method:** `PUT`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Body:**
```
pricing:
  sellingPrice: -5000
```

**Expected Response:** `400 Bad Request`

---

## 5️⃣ DELETE PRODUCT (SOFT DELETE)

### ✅ VALID TEST CASES

#### Test 5.1: Delete Existing Product
**Method:** `DELETE`  
**Endpoint:** `/shops/:shopId/products/:id`  

**Expected Response:** `204 No Content`

---

### ❌ INVALID TEST CASES

#### Test 5.2: Delete Non-Existent Product
**Method:** `DELETE`  
**Endpoint:** `/shops/:shopId/products/674a1b2c3d4e5f6g7h8i9999`  

**Expected Response:** `404 Not Found`

---

#### Test 5.3: Delete Already Deleted Product
**Method:** `DELETE`  
**Endpoint:** `/shops/:shopId/products/:deletedProductId`  

**Expected Response:** `404 Not Found`

---

## 6️⃣ UPDATE STOCK

### ✅ VALID TEST CASES

#### Test 6.1: Add Stock
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: add
quantity: 10
reason: New stock arrival
referenceType: purchase
```

**Expected Response:** `200 OK`
```
data:
  previousQuantity: 5
  newQuantity: 15
  status: in_stock
  transaction:
    transactionType: IN
    quantity: 10
```

---

#### Test 6.2: Subtract Stock
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: subtract
quantity: 3
reason: Sale
referenceType: sale
referenceId: 674a1b2c3d4e5f6g7h8iSALE
```

**Expected Response:** `200 OK`
```
data:
  previousQuantity: 15
  newQuantity: 12
  transaction:
    transactionType: OUT
```

---

#### Test 6.3: Set Stock to Specific Quantity
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: set
quantity: 50
reason: Stock count correction
referenceType: manual_adjustment
```

**Expected Response:** `200 OK`
```
data:
  previousQuantity: 12
  newQuantity: 50
  transaction:
    transactionType: ADJUSTMENT
```

---

### ❌ INVALID TEST CASES

#### Test 6.4: Invalid Operation
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: multiply
quantity: 5
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: operation
    message: Operation must be add, subtract, or set
```

---

#### Test 6.5: Subtract More Than Available
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: subtract
quantity: 100
```

**Expected Response:** `400 Bad Request`
```
success: false
message: Insufficient stock available
```

---

#### Test 6.6: Negative Quantity
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: add
quantity: -5
```

**Expected Response:** `400 Bad Request`

---

#### Test 6.7: Missing Quantity
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/stock`  
**Body:**
```
operation: add
reason: Test
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: quantity
    message: Quantity is required
```

---

## 7️⃣ RESERVE PRODUCT

### ✅ VALID TEST CASES

#### Test 7.1: Reserve Product for 7 Days
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
reservationDays: 7
notes: Customer wants to check with family
```

**Expected Response:** `200 OK`
```
success: true
message: Product reserved successfully
data:
  saleStatus: reserved
  reservedFor:
    customerId: 674a1b2c3d4e5f6g7h8iCUST
    reservedDate: 2024-02-06T10:30:00.000Z
    expiryDate: 2024-02-13T10:30:00.000Z
```

---

#### Test 7.2: Reserve Product for 30 Days
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
reservationDays: 30
notes: Long-term hold for wedding
```

**Expected Response:** `200 OK`

---

### ❌ INVALID TEST CASES

#### Test 7.3: Reserve Already Reserved Product
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
```

**Expected Response:** `400 Bad Request`
```
success: false
message: Product is already reserved
```

---

#### Test 7.4: Reserve Sold Product
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:soldProductId/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
```

**Expected Response:** `400 Bad Request`
```
message: Product is already sold
```

---

#### Test 7.5: Reserve Out of Stock Product
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:outOfStockId/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
```

**Expected Response:** `400 Bad Request`
```
message: Product is out of stock
```

---

#### Test 7.6: Missing Customer ID
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/reserve`  
**Body:**
```
reservationDays: 7
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: customerId
    message: Customer ID is required
```

---

#### Test 7.7: Invalid Reservation Days (> 365)
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/reserve`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
reservationDays: 400
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: reservationDays
    message: Reservation days must be between 1 and 365
```

---

## 8️⃣ CANCEL RESERVATION

### ✅ VALID TEST CASES

#### Test 8.1: Cancel Valid Reservation
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/cancel-reservation`  

**Expected Response:** `200 OK`
```
success: true
message: Reservation cancelled successfully
data:
  saleStatus: available
```

---

### ❌ INVALID TEST CASES

#### Test 8.2: Cancel Non-Reserved Product
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:availableProductId/cancel-reservation`  

**Expected Response:** `400 Bad Request`
```
message: Product is not reserved
```

---

## 9️⃣ MARK AS SOLD

### ✅ VALID TEST CASES

#### Test 9.1: Mark Product as Sold
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/sold`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
saleId: 674a1b2c3d4e5f6g7h8iSALE
```

**Expected Response:** `200 OK`
```
success: true
message: Product marked as sold successfully
data:
  saleStatus: sold
  soldDate: 2024-02-06T10:30:00.000Z
  stock:
    quantity: 4 (decremented by 1)
    status: in_stock
```

---

### ❌ INVALID TEST CASES

#### Test 9.2: Mark Already Sold Product
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:soldProductId/sold`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
```

**Expected Response:** `400 Bad Request`
```
message: Product is already sold
```

---

#### Test 9.3: Mark Out of Stock Product as Sold
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:outOfStockId/sold`  
**Body:**
```
customerId: 674a1b2c3d4e5f6g7h8iCUST
```

**Expected Response:** `400 Bad Request`
```
message: Product is out of stock
```

---

#### Test 9.4: Missing Customer ID
**Method:** `PATCH`  
**Endpoint:** `/shops/:shopId/products/:id/sold`  
**Body:**
```
saleId: 674a1b2c3d4e5f6g7h8iSALE
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: customerId
    message: Customer ID is required
```

---

## 🔟 RECALCULATE PRICE

### ✅ VALID TEST CASES

#### Test 10.1: Recalculate with Current Metal Rates
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/:id/calculate-price`  
**Body:**
```
useCurrentRate: true
```

**Expected Response:** `200 OK`
```
success: true
message: Price recalculated successfully
data:
  oldPrice: 95000
  newPrice: 98500
  difference: 3500
  differencePercentage: 3.68
  pricing:
    metalRate: 6350
    metalValue: 95250
    ... (full pricing breakdown)
```

---

#### Test 10.2: Recalculate with Custom Metal Rate
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/:id/calculate-price`  
**Body:**
```
useCurrentRate: false
customRate: 7000
```

**Expected Response:** `200 OK`
```
data:
  oldPrice: 95000
  newPrice: 105000
  difference: 10000
  differencePercentage: 10.53
```

---

### ❌ INVALID TEST CASES

#### Test 10.3: No Rate Specified
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/:id/calculate-price`  
**Body:**
```
{}
```

**Expected Response:** `400 Bad Request`
```
message: Either useCurrentRate or customRate must be provided
```

---

#### Test 10.4: Negative Custom Rate
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/:id/calculate-price`  
**Body:**
```
useCurrentRate: false
customRate: -5000
```

**Expected Response:** `400 Bad Request`

---

#### Test 10.5: Metal Rates Not Found
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/:id/calculate-price`  
**Body:**
```
useCurrentRate: true
```

**Expected Response:** `400 Bad Request` (if no metal rates set)
```
message: Current metal rates not found
```

---

## 1️⃣1️⃣ GET LOW STOCK PRODUCTS

### ✅ VALID TEST CASES

#### Test 11.1: Get Low Stock Products (Default)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/low-stock`  

**Expected Response:** `200 OK`
```
success: true
data: [array of low stock products]
meta:
  totalLowStockItems: 12
  criticalItems: 3 (out of stock items)
```

---

#### Test 11.2: Get Low Stock with Custom Threshold
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/low-stock?threshold=5`  

**Expected Response:** `200 OK`
```
data: [products with quantity <= 5]
```

---

### ❌ INVALID TEST CASES

#### Test 11.3: Negative Threshold
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/low-stock?threshold=-5`  

**Expected Response:** `400 Bad Request`

---

## 1️⃣2️⃣ SEARCH PRODUCTS (QUICK SEARCH)

### ✅ VALID TEST CASES

#### Test 12.1: Search by Name
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search?q=ring`  

**Expected Response:** `200 OK`
```
success: true
data: [products matching "ring"]
```

---

#### Test 12.2: Search by Product Code
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search?q=PRD000001`  

**Expected Response:** `200 OK`

---

#### Test 12.3: Search with Limit
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search?q=gold&limit=5`  

**Expected Response:** `200 OK` (max 5 results)

---

### ❌ INVALID TEST CASES

#### Test 12.4: Empty Search Query
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search?q=`  

**Expected Response:** `400 Bad Request`

---

#### Test 12.5: Missing Search Query
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search`  

**Expected Response:** `400 Bad Request`
```
errors:
  - field: q
    message: Search query is required
```

---

#### Test 12.6: Limit Too High (> 50)
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/search?q=gold&limit=100`  

**Expected Response:** `400 Bad Request`

---

## 1️⃣3️⃣ GET PRODUCT HISTORY

### ✅ VALID TEST CASES

#### Test 13.1: Get Product Transaction History
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/:id/history`  

**Expected Response:** `200 OK`
```
success: true
data:
  product:
    _id: 674a1b2c3d4e5f6g7h8i9j0k
    name: Golden Wedding Ring
    productCode: PRD000001
  history: [
    {
      transactionType: IN
      quantity: 5
      previousQuantity: 0
      newQuantity: 5
      reason: Initial stock entry
      performedBy: {...}
      transactionDate: ...
    },
    {
      transactionType: OUT
      quantity: 1
      previousQuantity: 5
      newQuantity: 4
      reason: Sale
      ...
    }
  ]
```

---

#### Test 13.2: Get History with Limit
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/:id/history?limit=10`  

**Expected Response:** `200 OK` (max 10 transactions)

---

### ❌ INVALID TEST CASES

#### Test 13.3: Non-Existent Product
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/674a1b2c3d4e5f6g7h8i9999/history`  

**Expected Response:** `404 Not Found`

---

## 1️⃣4️⃣ BULK DELETE PRODUCTS

### ✅ VALID TEST CASES

#### Test 14.1: Bulk Delete Multiple Products
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-delete`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01",
  "674a1b2c3d4e5f6g7h8i9j02",
  "674a1b2c3d4e5f6g7h8i9j03"
]
```

**Expected Response:** `200 OK`
```
success: true
message: 3 products deleted successfully
data:
  deletedCount: 3
```

---

### ❌ INVALID TEST CASES

#### Test 14.2: Empty Product IDs Array
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-delete`  
**Body:**
```
productIds: []
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: productIds
    message: Product IDs must be a non-empty array
```

---

#### Test 14.3: Invalid Product ID in Array
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-delete`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01",
  "invalid_id"
]
```

**Expected Response:** `400 Bad Request`

---

#### Test 14.4: No Products Found to Delete
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-delete`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9999",
  "674a1b2c3d4e5f6g7h8i9998"
]
```

**Expected Response:** `404 Not Found`
```
message: No products found to delete
```

---

## 1️⃣5️⃣ BULK UPDATE STATUS

### ✅ VALID TEST CASES

#### Test 15.1: Bulk Update to Discontinued
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-update-status`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01",
  "674a1b2c3d4e5f6g7h8i9j02"
]
status: discontinued
```

**Expected Response:** `200 OK`
```
success: true
message: 2 products updated successfully
data:
  modifiedCount: 2
```

---

#### Test 15.2: Bulk Update to On Order
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-update-status`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01"
]
status: on_order
```

**Expected Response:** `200 OK`

---

### ❌ INVALID TEST CASES

#### Test 15.3: Invalid Status
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-update-status`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01"
]
status: invalid_status
```

**Expected Response:** `400 Bad Request`
```
errors:
  - field: status
    message: Invalid status
```

---

#### Test 15.4: Missing Status
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products/bulk-update-status`  
**Body:**
```
productIds: [
  "674a1b2c3d4e5f6g7h8i9j01"
]
```

**Expected Response:** `400 Bad Request`

---

## 1️⃣6️⃣ GET PRODUCT ANALYTICS

### ✅ VALID TEST CASES

#### Test 16.1: Get Product Analytics
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products/analytics`  

**Expected Response:** `200 OK`
```
success: true
data:
  overview:
    totalProducts: 150
    activeProducts: 142
    inactiveProducts: 8
    lowStockCount: 12
    outOfStockCount: 3
    totalInventoryValue: 12500000
  categoryBreakdown: [
    {
      _id: 674a1b2c3d4e5f6g7h8i9j0k
      categoryName: Rings
      count: 45
      totalValue: 4250000
    },
    {
      _id: 674a1b2c3d4e5f6g7h8i9j0l
      categoryName: Necklaces
      count: 38
      totalValue: 5800000
    }
  ]
```

---

## 🔐 AUTHORIZATION TEST CASES

### Test AUTH-1: No Token Provided
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products`  
**Headers:** (No Authorization header)

**Expected Response:** `401 Unauthorized`

---

### Test AUTH-2: Invalid Token
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products`  
**Headers:**
```
Authorization: Bearer invalid_token_here
```

**Expected Response:** `401 Unauthorized`

---

### Test AUTH-3: Expired Token
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products`  
**Headers:**
```
Authorization: Bearer (expired_token)
```

**Expected Response:** `401 Unauthorized`

---

### Test AUTH-4: Insufficient Permissions (Staff trying to delete)
**Method:** `DELETE`  
**Endpoint:** `/shops/:shopId/products/:id`  
**Headers:**
```
Authorization: Bearer (staff_token)
```

**Expected Response:** `403 Forbidden`
```
message: You do not have permission to perform this action
```

---

### Test AUTH-5: Access Different Shop's Product
**Method:** `GET`  
**Endpoint:** `/shops/different_shop_id/products/:id`  

**Expected Response:** `403 Forbidden`

---

## ⚡ PERFORMANCE & EDGE CASES

### Test PERF-1: Large Pagination Request
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?page=1&limit=100`  

**Expected:** Should handle without timeout

---

### Test PERF-2: Complex Multi-Filter Query
**Method:** `GET`  
**Endpoint:** `/shops/:shopId/products?metalType=gold&purity=22K&minPrice=50000&maxPrice=200000&gender=female&search=wedding&sort=-createdAt`  

**Expected:** Results within acceptable time

---

### Test EDGE-1: Unicode Characters in Name
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
name: सोने की अंगूठी (Gold Ring)
categoryId: 674a1b2c3d4e5f6g7h8i9j0k
... (rest of required fields)
```

**Expected:** `201 Created` (should handle Unicode)

---

### Test EDGE-2: Very Long Description (1999 chars)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
description: (1999 character string)
... (rest of fields)
```

**Expected:** `201 Created`

---

### Test EDGE-3: Exactly at 2000 Character Limit
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
description: (exactly 2000 characters)
```

**Expected:** `201 Created`

---

### Test EDGE-4: 2001 Characters (Over Limit)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
description: (2001 characters)
```

**Expected:** `400 Bad Request`

---

### Test EDGE-5: Zero Stock Product
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
... (all required fields)
stock:
  quantity: 0
```

**Expected:** `201 Created` with `status: out_of_stock`

---

### Test EDGE-6: Extremely High Price
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
pricing:
  sellingPrice: 99999999
```

**Expected:** `201 Created` (should handle large numbers)

---

### Test EDGE-7: Very Small Weight (0.001 gram)
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
weight:
  grossWeight: 0.001
  stoneWeight: 0
```

**Expected:** `201 Created`

---

### Test EDGE-8: Stone Weight > Gross Weight
**Method:** `POST`  
**Endpoint:** `/shops/:shopId/products`  
**Body:**
```
weight:
  grossWeight: 10
  stoneWeight: 15
```

**Expected:** Net weight should be 0 or handled gracefully

---

## 📊 SUMMARY

### TOTAL TEST CASES: 120+

**Valid Cases:** ~65  
**Invalid Cases:** ~55

### BY CATEGORY:
- Create Product: 20 tests (5 valid, 15 invalid)
- Get All Products: 19 tests (13 valid, 6 invalid)
- Get Single Product: 4 tests (1 valid, 3 invalid)
- Update Product: 13 tests (8 valid, 5 invalid)
- Delete Product: 3 tests (1 valid, 2 invalid)
- Update Stock: 7 tests (3 valid, 4 invalid)
- Reserve Product: 7 tests (2 valid, 5 invalid)
- Cancel Reservation: 2 tests (1 valid, 1 invalid)
- Mark as Sold: 4 tests (1 valid, 3 invalid)
- Recalculate Price: 5 tests (2 valid, 3 invalid)
- Low Stock: 3 tests (2 valid, 1 invalid)
- Search Products: 6 tests (3 valid, 3 invalid)
- Product History: 3 tests (2 valid, 1 invalid)
- Bulk Delete: 4 tests (1 valid, 3 invalid)
- Bulk Update Status: 4 tests (2 valid, 2 invalid)
- Analytics: 1 test (1 valid)
- Authorization: 5 tests (0 valid, 5 invalid)
- Performance & Edge: 10 tests

---

## 🎯 POSTMAN ENVIRONMENT VARIABLES

```
baseUrl = http://localhost:5000/api/v1
authToken = (your JWT token)
shopId = 674a1b2c3d4e5f6g7h8i9ABC
productId = (auto-captured from create response)
categoryId = 674a1b2c3d4e5f6g7h8i9CAT
subCategoryId = 674a1b2c3d4e5f6g7h8i9SUB
customerId = 674a1b2c3d4e5f6g7h8iCUST
```

---

## 📝 NOTES

1. Replace `:shopId`, `:id`, etc. with actual values or use Postman variables
2. All requests require valid JWT token in Authorization header
3. Test cases assume metal rates are already set in the system
4. Some tests require pre-existing data (products, categories, customers)
5. Soft delete means `deletedAt` field is set, not actual deletion
6. Stock status auto-updates based on quantity and reorderLevel
7. Pricing auto-calculates when weight or making charges change
8. Net weight = Gross weight - Stone weight (auto-calculated)