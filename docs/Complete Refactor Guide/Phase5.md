## Phase 5 — Sales Service Thin

---

## Pehle Samjho — "Thin" Kyun Karna Hai

Abhi sales.service.js ka size aur responsibility bahut zyada hai. Ek service jo itna kuch kare wo maintenance nightmare ban jati hai.

```
Problem:
Sales service abhi khud karta hai:
- Inventory manage karna
- Ledger entries banana
- Customer statistics update karna
- Payment logic handle karna

Ye sab sales service ka kaam NAHI hai.
Sales service ka kaam sirf hai:
"Sale create karo, validate karo, return karo"
```

---

## Abhi Sales Service Me Kya Hai

```
createSale()
  → inventory decrease karo        ← inventory.service se ho raha hai ✅
  → ledger debit entry banao       ← ledger.service se ho raha hai ✅
  → customer statistics update karo ← ABHI BHI DIRECT hai ⚠️

returnSale()
  → inventory return karo          ← inventory.service se ho raha hai ✅
  → ledger credit entry banao      ← ledger.service se ho raha hai ✅
  → customer statistics update karo ← ABHI BHI DIRECT hai ⚠️

deleteSale() / cancelSale() / bulkDeleteSales()
  → inventory return karo          ← inventory.service se ho raha hai ✅
  → customer statistics update karo ← ABHI BHI DIRECT hai ⚠️
```

---

## Customer Statistics — Kya Problem Hai

Sales service abhi ye karta hai:

```javascript
// createSale me:
customer.statistics.totalPurchases += 1;
customer.statistics.totalSpent += sale.financials.grandTotal;
customer.statistics.lastPurchaseDate = new Date();
await customer.save();

// returnSale me:
customer.statistics.totalPurchases -= 1;
customer.statistics.totalSpent -= refundAmount;
await customer.save();
```

**Problem:**
```
Sales service Customer model ko directly
import karke uski internals change kar raha hai.

Kal agar Customer model ka field name badla
ya statistics ka structure badla —
sales.service.js bhi todna padega.

Ye tight coupling hai.
```

---

## Kya Karna Hai

Same pattern jo Sale/Purchase me kiya payment ke liye — **Customer model me static methods banao.**

```javascript
// Customer.js me add karo:
customerSchema.statics.recordPurchase = async function(customerId, amount, date)
customerSchema.statics.reversePurchase = async function(customerId, amount)
```

```javascript
// sales.service.js me:
// HATAO: customer.statistics direct update
// LAGAO: Customer.recordPurchase() / Customer.reversePurchase()
```

---

## Kaun Kaun Si Functions Me Badlav Hoga

```
createSale()
  HATAO: Customer.findById + customer.statistics update
  LAGAO: Customer.recordPurchase(customerId, amount)

returnSale()
  HATAO: Customer.findById + customer.statistics update
  LAGAO: Customer.reversePurchase(customerId, amount)

deleteSale()
  HATAO: Customer.findById + customer.statistics update
  LAGAO: Customer.reversePurchase(customerId, amount)

cancelSale()
  HATAO: Customer.findById + customer.statistics update
  LAGAO: Customer.reversePurchase(customerId, amount)

bulkDeleteSales()
  HATAO: Customer.findById loop + statistics update
  LAGAO: Customer.reversePurchase() per sale
```

---

## Shop Statistics — Bhi Yahi Problem Hai

```javascript
// createSale me:
shop.statistics.totalSales += 1;
shop.statistics.totalRevenue += sale.financials.grandTotal;
await shop.save();
```

Ye bhi Sales service ka kaam nahi hai. Lekin **is phase me skip karo** — Shop statistics future me event-driven ya analytics service me move ho sakti hai. Abhi focus Customer pe karo.

---

## Phase 5 Ke Baad Kya Milega

```
BEFORE:
sales.service → Customer model direct import
             → customer.statistics manually update
             → Customer ki internals jaanta hai

AFTER:
sales.service → Customer.recordPurchase() call karo
             → Customer khud apni statistics manage kare
             → Sales service ko Customer ki internals
                pata honi ki zarurat nahi
```

---

## Files Jo Change Hongi

```
1. src/models/Customer.js
   → recordPurchase() static add karo
   → reversePurchase() static add karo

2. src/api/sales/sales.service.js
   → Customer direct statistics update HATAO
   → Customer.recordPurchase() / reversePurchase() LAGAO
```

---

## Summary

```
Phase 5 Goal:
  Sales service Customer ki internals se
  aazad ho jaye

Approach:
  Customer model me statics banao
  Sales service unhe call kare

Risk:
  Kam — straightforward refactor hai

Files: 2
  Customer.js + sales.service.js
```

Sales service do — exact changes bataunga.