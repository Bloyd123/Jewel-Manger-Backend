# Jewelry Management System - Class Diagram

## System Architecture Overview

This document presents the complete class structure for a multi-tenant jewelry management ERP system built with Node.js and MongoDB.

---

## 📋 Table of Contents

1. [Core Identity & Tenant Management](#core-identity--tenant-management)
2. [Shop & Location Management](#shop--location-management)
3. [Product & Inventory Management](#product--inventory-management)
4. [Customer & Supplier Management](#customer--supplier-management)
5. [Sales & Orders](#sales--orders)
6. [Financial Management](#financial-management)
7. [Audit & Logging](#audit--logging)
8. [System Relationships](#system-relationships)

---

## Core Identity & Tenant Management

### Organization

**Purpose**: Top-level tenant entity representing a jewelry business organization

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `name`: String - Organization name
- `slug`: String - URL-friendly identifier (unique)
- `email`: String - Primary contact email (unique)
- `phone`: String - Contact phone number
- `address`: Object - Physical address details
- `gstNumber`: String - GST registration (unique)
- `panNumber`: String - PAN card number (unique)
- `subscription`: Object - Subscription plan details
  - `plan`: String (free, basic, premium, enterprise)
  - `status`: String (trial, active, suspended, expired)
  - `maxShops`: Number
  - `maxUsers`: Number
  - `features`: Object
- `settings`: Object - Organization-wide settings
- `isActive`: Boolean - Active status
- `createdAt`: Date
- `updatedAt`: Date

**Methods**:
- `generateSlug(name)`: String - Generate unique slug from name
- `isSubscriptionActive()`: Boolean - Check if subscription is valid
- `hasFeature(featureName)`: Boolean - Check feature availability
- `updateUsage()`: Promise - Update usage statistics
- `extendSubscription(days)`: Promise - Extend subscription period
- `canAddShop()`: Boolean - Check if can add more shops
- `canAddUser()`: Boolean - Check if can add more users

---

### User

**Purpose**: System user with role-based access control

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `username`: String - Unique username
- `email`: String - Email address (unique)
- `password`: String - Hashed password (select: false)
- `firstName`: String - First name
- `lastName`: String - Last name
- `phone`: String - Contact number
- `role`: String - System role (super_admin, org_admin, shop_admin, manager, staff, accountant, viewer)
- `organizationId`: ObjectId - Reference to Organization
- `primaryShop`: ObjectId - Default shop reference
- `isActive`: Boolean - Active status
- `lastLogin`: Date - Last login timestamp
- `lastLoginIP`: String - Last login IP address
- `preferences`: Object - User preferences
  - `language`: String
  - `timezone`: String
  - `theme`: String
- `createdAt`: Date
- `updatedAt`: Date

**Methods**:
- `comparePassword(password)`: Boolean - Verify password
- `hasShopAccess(shopId)`: Boolean - Check shop access
- `getShopPermissions(shopId)`: Object - Get permissions for shop
- `hasPermission(shopId, permission)`: Boolean - Check specific permission
- `logActivity(action, module, metadata)`: Promise - Log user activity
- `updateLastLogin(ipAddress)`: Promise - Update login info
- `softDelete()`: Promise - Soft delete user
- `restore()`: Promise - Restore deleted user

---

### UserShopAccess

**Purpose**: Granular permission management for users across shops

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId - Reference to User
- `shopId`: ObjectId - Reference to JewelryShop
- `organizationId`: ObjectId - Reference to Organization
- `role`: String - Shop-specific role (shop_admin, manager, staff, viewer, accountant)
- `permissions`: Object - Detailed permissions
  - `canViewInventory`: Boolean
  - `canEditInventory`: Boolean
  - `canManageProducts`: Boolean
  - `canViewSales`: Boolean
  - `canCreateSales`: Boolean
  - `canApproveTransactions`: Boolean
  - ... (50+ granular permissions)
- `isActive`: Boolean
- `accessStartDate`: Date
- `accessEndDate`: Date
- `assignedBy`: ObjectId - Who granted access
- `lastAccessedAt`: Date
- `revokedAt`: Date

**Methods**:
- `hasPermission(permission)`: Boolean - Check single permission
- `hasAnyPermission(array)`: Boolean - Check if has any permission
- `hasAllPermissions(array)`: Boolean - Check if has all permissions
- `updatePermissions(permissions)`: Promise - Update permissions
- `revoke(userId, reason)`: Promise - Revoke access
- `restoreAccess()`: Promise - Restore revoked access
- `extendAccess(days)`: Promise - Extend access period

---

### RefreshToken

**Purpose**: JWT refresh token management with device tracking

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId - Reference to User
- `organizationId`: ObjectId - Reference to Organization
- `token`: String - Refresh token (unique)
- `tokenId`: String - Token identifier (unique)
- `isRevoked`: Boolean - Revocation status
- `expiresAt`: Date - Expiry timestamp
- `ipAddress`: String - IP address
- `userAgent`: String - Browser user agent
- `device`: Object - Parsed device info
  - `type`: String (mobile, tablet, desktop)
  - `browser`: String
  - `os`: String
- `lastUsedAt`: Date
- `usageCount`: Number

**Methods**:
- `revoke(reason)`: Promise - Revoke token
- `updateLastUsed(ipAddress)`: Promise - Update usage
- `belongsTo(userId)`: Boolean - Check ownership
- `getInfo()`: Object - Get sanitized token info

---

## Shop & Location Management

### JewelryShop

**Purpose**: Individual shop/branch location

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `code`: String - Shop code (unique)
- `name`: String - Shop name
- `organizationId`: ObjectId - Reference to Organization
- `managerId`: ObjectId - Reference to User (manager)
- `address`: Object - Shop address
  - `street`: String
  - `city`: String
  - `state`: String
  - `pincode`: String
  - `location`: Object (GeoJSON)
- `gstNumber`: String - Shop GST number
- `phone`: String - Contact number
- `settings`: Object - Shop-specific settings
  - `currency`: String
  - `defaultWeightUnit`: String
  - `enableHallmarking`: Boolean
  - `invoicePrefix`: String
  - `gstRates`: Object
- `metalRates`: Object - Current metal rates
  - `gold`: Object (rate24K, rate22K, rate18K)
  - `silver`: Object (rate999, rate925)
  - `platinum`: Object
- `businessHours`: Object - Operating hours
- `statistics`: Object - Shop statistics
- `isActive`: Boolean
- `createdAt`: Date

**Methods**:
- `updateMetalRates(rates, userId)`: Promise - Update current rates
- `getNextInvoiceNumber()`: String - Generate next invoice number
- `updateStatistics()`: Promise - Refresh shop statistics
- `closeTemporarily(reason, from, until)`: Promise - Temporary closure
- `reopenShop()`: Promise - Reopen closed shop
- `hasFeature(featureName)`: Boolean - Check feature availability
- `getPrimaryBank()`: Object - Get primary bank account
- `isCurrentlyOpen()`: Boolean - Check if open now

---

## Product & Inventory Management

### Product

**Purpose**: Jewelry product/item in inventory

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `productCode`: String - Product code (unique per shop)
- `shopId`: ObjectId - Reference to JewelryShop
- `categoryId`: ObjectId - Reference to Category
- `name`: String - Product name
- `metal`: Object - Metal details
  - `type`: String (gold, silver, platinum, diamond)
  - `purity`: String (24K, 22K, 916, 999, etc.)
  - `color`: String (yellow, white, rose)
- `weight`: Object - Weight details
  - `grossWeight`: Number
  - `stoneWeight`: Number
  - `netWeight`: Number (calculated)
  - `unit`: String (gram, kg, tola)
- `stones`: Array - Stone details
  - `stoneType`: String
  - `stoneQuality`: String
  - `caratWeight`: Number
  - `pieceCount`: Number
  - `stonePrice`: Number
- `makingCharges`: Object
  - `type`: String (per_gram, percentage, flat)
  - `value`: Number
  - `amount`: Number
- `pricing`: Object - Price breakdown
  - `metalRate`: Number
  - `metalValue`: Number
  - `stoneValue`: Number
  - `makingCharges`: Number
  - `gst`: Object
  - `totalPrice`: Number
  - `sellingPrice`: Number
- `stock`: Object - Inventory
  - `quantity`: Number
  - `minStockLevel`: Number
  - `location`: Object
- `status`: String (in_stock, out_of_stock, low_stock)
- `saleStatus`: String (available, reserved, sold, on_hold)
- `images`: Array - Product images
- `createdAt`: Date

**Methods**:
- `calculatePrice(metalRate)`: Promise - Calculate pricing
- `updateStock(quantity, operation)`: Promise - Update inventory
- `markAsSold(customerId)`: Promise - Mark as sold
- `reserveProduct(customerId, days)`: Promise - Reserve product
- `cancelReservation()`: Promise - Cancel reservation
- `softDelete()`: Promise - Soft delete product

---

### InventoryTransaction

**Purpose**: Track all inventory movements

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `productId`: ObjectId - Reference to Product
- `shopId`: ObjectId - Reference to JewelryShop
- `transactionType`: String (IN, OUT, SALE, PURCHASE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT, DAMAGE, RESERVED)
- `quantity`: Number - Transaction quantity
- `previousQuantity`: Number - Before transaction
- `newQuantity`: Number - After transaction
- `transactionDate`: Date
- `referenceType`: String - Reference document type
- `referenceId`: ObjectId - Reference to source document
- `performedBy`: ObjectId - Reference to User
- `reason`: String - Transaction reason
- `metadata`: Object - Additional data
- `createdAt`: Date

**Static Methods**:
- `getProductHistory(productId, limit)`: Promise - Get product history
- `getByDateRange(shopId, startDate, endDate)`: Promise - Get transactions by date
- `getInboundTransactions(shopId, days)`: Promise - Get stock additions
- `getOutboundTransactions(shopId, days)`: Promise - Get stock reductions

---

### MetalRate

**Purpose**: Daily metal rate management with trend tracking

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `shopId`: ObjectId - Reference to JewelryShop
- `organizationId`: ObjectId - Reference to Organization
- `rateDate`: Date - Rate effective date
- `gold`: Object - Gold rates
  - `gold24K`: Object (buyingRate, sellingRate)
  - `gold22K`: Object (buyingRate, sellingRate)
  - `gold18K`: Object (buyingRate, sellingRate)
- `silver`: Object - Silver rates
  - `pure`: Object (buyingRate, sellingRate)
  - `sterling925`: Object (buyingRate, sellingRate)
- `platinum`: Object - Platinum rates
- `purity`: Object - Purity percentages for conversion
- `trendData`: Object - Moving averages
  - `gold`: Object (ma7, ma30, ma90)
  - `silver`: Object (ma7, ma30, ma90)
- `isCurrent`: Boolean - Is current active rate
- `isActive`: Boolean
- `validFrom`: Date
- `validUntil`: Date
- `createdAt`: Date

**Methods**:
- `makeCurrentRate()`: Promise - Set as current rate
- `getRateForPurity(metalType, purity)`: Object - Get rate for specific purity
- `getTrendData(metalType)`: Object - Get trend analytics

**Static Methods**:
- `getCurrentRate(shopId)`: Promise - Get current active rate
- `getRateByDate(shopId, date)`: Promise - Get historical rate
- `calculateMovingAverage(shopId, metalType, days)`: Promise - Calculate MA
- `getTrendChartData(shopId, metalType, days)`: Promise - Get chart data

---

## Customer & Supplier Management

### Customer

**Purpose**: Customer/party management with loyalty tracking

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `customerCode`: String - Customer code (unique per shop)
- `shopId`: ObjectId - Reference to JewelryShop
- `firstName`: String
- `lastName`: String
- `phone`: String - Primary phone (required)
- `email`: String
- `address`: Object - Customer address
- `customerType`: String (retail, wholesale, vip, regular)
- `loyaltyPoints`: Number - Loyalty points balance
- `membershipTier`: String (standard, silver, gold, platinum)
- `statistics`: Object - Customer statistics
  - `totalOrders`: Number
  - `totalSpent`: Number
  - `averageOrderValue`: Number
  - `lastOrderDate`: Date
- `currentBalance`: Number - Account balance
- `totalPurchases`: Number
- `totalDue`: Number
- `isActive`: Boolean
- `isBlacklisted`: Boolean
- `createdAt`: Date

**Methods**:
- `addLoyaltyPoints(points)`: Promise - Add loyalty points
- `redeemLoyaltyPoints(points)`: Promise - Redeem points
- `updateBalance(amount)`: Promise - Update account balance
- `blacklist(reason)`: Promise - Blacklist customer
- `removeBlacklist()`: Promise - Remove from blacklist
- `softDelete()`: Promise - Soft delete customer

**Static Methods**:
- `generateCustomerCode(shopId, prefix)`: Promise - Generate unique code
- `findByPhone(phone)`: Promise - Find by phone number
- `findVIPCustomers(shopId)`: Promise - Find VIP customers
- `findTopCustomers(shopId, limit)`: Promise - Top customers by spending

---

### Supplier

**Purpose**: Supplier/vendor management

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `supplierCode`: String - Supplier code (unique per shop)
- `shopId`: ObjectId - Reference to JewelryShop
- `businessName`: String - Business name
- `contactPerson`: Object
  - `firstName`: String
  - `phone`: String
  - `email`: String
- `phone`: String - Business phone
- `address`: Object - Business address
- `gstNumber`: String - GST number
- `supplierType`: String (manufacturer, wholesaler, distributor, artisan)
- `supplierCategory`: String (gold, silver, diamond, platinum, mixed)
- `creditLimit`: Number - Credit limit
- `statistics`: Object - Supplier statistics
  - `totalOrders`: Number
  - `totalPurchased`: Number
  - `averageOrderValue`: Number
- `currentBalance`: Number
- `rating`: Number - Overall rating (1-5)
- `isActive`: Boolean
- `isPreferred`: Boolean
- `createdAt`: Date

**Methods**:
- `updateBalance(amount)`: Promise - Update balance
- `blacklist(reason)`: Promise - Blacklist supplier
- `removeBlacklist()`: Promise - Remove blacklist
- `markAsPreferred()`: Promise - Mark as preferred
- `updateRating(quality, delivery, price)`: Promise - Update ratings
- `softDelete()`: Promise - Soft delete

**Static Methods**:
- `generateSupplierCode(shopId, prefix)`: Promise - Generate unique code
- `findPreferred(shopId)`: Promise - Find preferred suppliers
- `findTopSuppliers(shopId, limit)`: Promise - Top suppliers by volume

---

## Sales & Orders

### Sale

**Purpose**: Sales transaction/invoice management

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `invoiceNumber`: String - Invoice number (unique)
- `shopId`: ObjectId - Reference to JewelryShop
- `customerId`: ObjectId - Reference to Customer
- `saleDate`: Date - Sale date
- `saleType`: String (retail, wholesale, exchange, order_fulfillment)
- `items`: Array - Sale items
  - `productId`: ObjectId
  - `productName`: String
  - `metalType`: String
  - `weight`: Object
  - `pricing`: Object
  - `quantity`: Number
- `oldGoldExchange`: Object - Old gold exchange details
  - `hasExchange`: Boolean
  - `items`: Array
  - `totalValue`: Number
- `financials`: Object - Financial summary
  - `subtotal`: Number
  - `totalGST`: Number
  - `grandTotal`: Number
  - `netPayable`: Number
- `payment`: Object - Payment details
  - `totalAmount`: Number
  - `paidAmount`: Number
  - `dueAmount`: Number
  - `paymentStatus`: String (paid, partial, unpaid)
  - `payments`: Array
- `status`: String (draft, confirmed, delivered, completed, cancelled)
- `createdAt`: Date

**Methods**:
- `addPayment(paymentData)`: Promise - Add payment
- `markAsDelivered(userId)`: Promise - Mark as delivered
- `markAsCompleted()`: Promise - Complete sale
- `cancel()`: Promise - Cancel sale
- `processReturn(returnData)`: Promise - Process return
- `softDelete()`: Promise - Soft delete

**Static Methods**:
- `generateInvoiceNumber(shopId, prefix)`: Promise - Generate invoice number
- `findByCustomer(customerId)`: Promise - Find customer sales
- `findUnpaid(shopId)`: Promise - Find unpaid invoices

---

### Order

**Purpose**: Custom order/repair order management

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `orderNumber`: String - Order number (unique)
- `shopId`: ObjectId - Reference to JewelryShop
- `customerId`: ObjectId - Reference to Customer
- `orderDate`: Date
- `orderType`: String (custom_order, repair, alteration, engraving, polishing)
- `priority`: String (low, normal, high, urgent)
- `items`: Array - Order items with specifications
- `timeline`: Object - Timeline details
  - `estimatedStartDate`: Date
  - `estimatedCompletionDate`: Date
  - `actualCompletionDate`: Date
- `financials`: Object - Financial details
- `payment`: Object - Payment tracking
- `assignment`: Object - Work assignment
  - `assignedTo`: ObjectId
  - `assignedBy`: ObjectId
- `status`: String (draft, confirmed, in_progress, ready, delivered, completed)
- `createdAt`: Date

**Methods**:
- `addPayment(paymentData)`: Promise - Add payment
- `assignTo(userId, assignedBy)`: Promise - Assign to user
- `startWork()`: Promise - Start work
- `markAsReady()`: Promise - Mark as ready
- `markAsDelivered(deliveryData)`: Promise - Mark delivered
- `complete()`: Promise - Complete order
- `cancel(cancelData)`: Promise - Cancel order

**Static Methods**:
- `generateOrderNumber(shopId, orderType, prefix)`: Promise - Generate order number
- `findOverdue(shopId)`: Promise - Find overdue orders
- `findDueSoon(shopId, days)`: Promise - Find orders due soon

---

### Purchase

**Purpose**: Purchase transaction from suppliers

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `purchaseNumber`: String - Purchase number (unique)
- `shopId`: ObjectId - Reference to JewelryShop
- `supplierId`: ObjectId - Reference to Supplier
- `purchaseDate`: Date
- `purchaseType`: String (new_stock, old_gold, exchange, consignment)
- `items`: Array - Purchase items
- `financials`: Object - Financial summary
  - `subtotal`: Number
  - `totalGST`: Number
  - `grandTotal`: Number
- `payment`: Object - Payment details
  - `totalAmount`: Number
  - `paidAmount`: Number
  - `dueAmount`: Number
  - `paymentStatus`: String
  - `payments`: Array
- `supplierInvoice`: Object - Supplier invoice details
- `status`: String (draft, pending, ordered, received, completed)
- `approvalStatus`: String (pending, approved, rejected)
- `createdAt`: Date

**Methods**:
- `addPayment(paymentData)`: Promise - Add payment
- `approve(userId)`: Promise - Approve purchase
- `reject(userId, reason)`: Promise - Reject purchase
- `markAsReceived(userId)`: Promise - Mark as received
- `cancel()`: Promise - Cancel purchase

**Static Methods**:
- `generatePurchaseNumber(shopId, prefix)`: Promise - Generate number
- `findBySupplier(supplierId)`: Promise - Find by supplier
- `findUnpaid(shopId)`: Promise - Find unpaid purchases

---

## Financial Management

### Payment

**Purpose**: Payment transaction tracking

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `paymentNumber`: String - Payment number (unique)
- `shopId`: ObjectId - Reference to JewelryShop
- `paymentType`: String (sale_payment, purchase_payment, scheme_payment)
- `transactionType`: String (receipt, payment) - Money in/out
- `amount`: Number - Payment amount
- `paymentMode`: String (cash, card, upi, cheque, bank_transfer)
- `paymentDetails`: Object - Mode-specific details
  - `cashDetails`: Object
  - `cardDetails`: Object
  - `upiDetails`: Object
  - `chequeDetails`: Object
- `status`: String (pending, completed, failed, cancelled)
- `reconciliation`: Object - Reconciliation details
  - `isReconciled`: Boolean
  - `reconciledAt`: Date
- `transactionId`: String
- `createdAt`: Date

**Methods**:
- `markAsCompleted()`: Promise - Mark as completed
- `markAsFailed(reason)`: Promise - Mark as failed
- `cancel(reason)`: Promise - Cancel payment
- `reconcile(userId, reconciledWith)`: Promise - Reconcile payment
- `updateChequeStatus(status, date, reason)`: Promise - Update cheque status
- `generateReceipt(receiptUrl)`: Promise - Generate receipt

**Static Methods**:
- `generatePaymentNumber(shopId, prefix)`: Promise - Generate number
- `findPendingCheques(shopId)`: Promise - Find pending cheques
- `findUnreconciled(shopId)`: Promise - Find unreconciled payments
- `getTodayCollection(shopId)`: Promise - Get today's collection

---

### Scheme

**Purpose**: Savings scheme/installment plan management

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `schemeCode`: String - Scheme code (unique)
- `shopId`: ObjectId - Reference to JewelryShop
- `schemeName`: String - Scheme name
- `schemeType`: String (gold_saving, installment, advance_booking)
- `duration`: Object - Duration details
  - `months`: Number
- `installments`: Object
  - `totalInstallments`: Number
  - `installmentAmount`: Number
  - `frequency`: String (weekly, monthly)
- `bonus`: Object - Bonus details
  - `hasBonus`: Boolean
  - `bonusType`: String (percentage, flat_amount)
  - `bonusValue`: Number
- `maturity`: Object - Maturity details
  - `totalSchemeAmount`: Number
  - `bonusAmount`: Number
  - `totalMaturityValue`: Number
- `limits`: Object
  - `maxEnrollments`: Number
  - `currentEnrollments`: Number
- `status`: String (draft, active, paused, expired)
- `createdAt`: Date

**Methods**:
- `activate()`: Promise - Activate scheme
- `pause()`: Promise - Pause scheme
- `approve(userId)`: Promise - Approve scheme
- `incrementEnrollment()`: Promise - Add enrollment
- `calculateMaturityValue(paidInstallments)`: Object - Calculate maturity
- `calculateEarlyRedemptionValue(paidInstallments)`: Object - Calculate early redemption

**Static Methods**:
- `generateSchemeCode(shopId, prefix)`: Promise - Generate code
- `findActive(shopId)`: Promise - Find active schemes
- `findExpiringSoon(shopId, days)`: Promise - Find expiring schemes

---

## Audit & Logging

### ActivityLog

**Purpose**: System-wide activity and audit logging

**Attributes**:
- `_id`: ObjectId (Primary Key)
- `userId`: ObjectId - Reference to User (optional)
- `organizationId`: ObjectId - Reference to Organization
- `shopId`: ObjectId - Reference to JewelryShop (optional)
- `action`: String - Action performed (create, update, delete, login)
- `module`: String - Module (auth, product, sale, purchase, customer)
- `description`: String - Action description
- `level`: String (info, warn, error, success, debug)
- `status`: String (success, failed, pending, cancelled)
- `ipAddress`: String - IP address
- `userAgent`: String - Browser user agent
- `metadata`: Object - Additional context data
- `createdAt`: Date

**Methods**:
- `isRecent()`: Boolean - Check if recent (within last hour)
- `getFormattedMessage()`: String - Get formatted log message

**Static Methods**:
- `findByUser(userId, options)`: Promise - Find user's activity
- `findByOrganization(organizationId, options)`: Promise - Find org activity
- `findByShop(shopId, options)`: Promise - Find shop activity
- `findByModule(module, organizationId, options)`: Promise - Find by module
- `findErrors(organizationId, options)`: Promise - Find error logs
- `getStatistics(organizationId, options)`: Promise - Get activity statistics
- `cleanOldLogs(daysToKeep)`: Promise - Clean old logs

---

## System Relationships

### Core Relationships

```
Organization (1) ──────── (*) JewelryShop
Organization (1) ──────── (*) User
Organization (1) ──────── (*) ActivityLog

User (1) ──────── (*) UserShopAccess
User (1) ──────── (*) RefreshToken
User (1) ──────── (*) ActivityLog

JewelryShop (1) ──────── (*) UserShopAccess
JewelryShop (1) ──────── (1) User [manager]
```

### Shop Operations Relationships

```
JewelryShop (1) ──────── (*) Product
JewelryShop (1) ──────── (*) Customer
JewelryShop (1) ──────── (*) Supplier
JewelryShop (1) ──────── (*) Sale
JewelryShop (1) ──────── (*) Purchase
JewelryShop (1) ──────── (*) Order
JewelryShop (1) ──────── (*) Payment
JewelryShop (1) ──────── (*) Scheme
JewelryShop (1) ──────── (*) MetalRate
JewelryShop (1) ──────── (*) ActivityLog
```

### Transaction Relationships

```
Product (1) ──────── (*) InventoryTransaction
Product (*) ──────── (1) Supplier

Customer (1) ──────── (*) Sale
Customer (1) ──────── (*) Order

Sale (*) ──────── (1) Customer
Sale (1) ──────── (0..1) Order
Sale (1) ──────── (*) Payment

Supplier (1) ──────── (*) Purchase
Purchase (*) ──────── (1) Supplier
Purchase (1) ──────── (*) Payment

Scheme (1) ──────── (*) Sale
```

---

## Key Design Patterns

### 1. **Multi-Tenancy Pattern**
- Organization → JewelryShop → All Operations
- Data isolation at organization level
- Shop-specific configurations and settings

### 2. **Soft Delete Pattern**
- All major entities have `deletedAt` field
- Pre-find middleware filters deleted records
- Restore functionality available

### 3. **Audit Trail Pattern**
- ActivityLog tracks all system operations
- User actions logged with context
- IP address and metadata captured

### 4. **Role-Based Access Control (RBAC)**
- UserShopAccess provides granular permissions
- 50+ permission flags
- Shop-specific role assignments

### 5. **Financial Reconciliation Pattern**
- Payment entity tracks all money movements
- Reconciliation status tracking
- Payment mode-specific details

### 6. **State Machine Pattern**
- Sale: draft → confirmed → delivered → completed
- Order: draft → in_progress → ready → delivered
- Purchase: draft → pending → received → completed

---

## Technical Implementation Notes

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with refresh tokens
- **Security**: bcrypt for password hashing

### Key Features
- Multi-tenant SaaS architecture
- Role-based access control
- Comprehensive audit logging
- Soft delete functionality
- Metal rate tracking with trends
- Payment reconciliation
- Inventory transaction tracking
- Customer loyalty program
- Scheme/installment management

### Performance Considerations
- Compound indexes on frequently queried fields
- Lean queries for list operations
- Virtual fields for calculated properties
- TTL indexes for token cleanup

---

## Version History

- **Version 1.0** - Initial class diagram documentation
- **Date**: January 2026
- **Status**: Production Ready

---

## Contact & Support

For questions or clarifications about this class structure:
- Review the mongoose schema files in `/models` directory
- Check API documentation for endpoint details
- Refer to permissions config for RBAC details

---

*This document represents the complete class structure of the Jewelry Management ERP System.*