## Phase 6 — Purchase Service Thin

---

## Pehle Samjho — Kya Problem Hai

```
Phase 5 me Sales Service se Customer ki
direct statistics update hatai.

Phase 6 me Purchase Service se Supplier ki
direct update hatani hai — same pattern.
```

---

## Abhi Purchase Service Me Kya Hota Hai

Purchase service me teen jagah Supplier directly touch hoti hai:

```
createPurchase()
  → Supplier find karo
  → supplier details copy karo — YE THEEK HAI
  → supplier statistics update karo — PROBLEM HAI

receivePurchase()
  → Supplier find karo
  → supplier.updateBalance() — YE PHASE 2 ME HAT GAYI
  → supplier statistics update karo — PROBLEM HAI

addPayment() / purchase me payment
  → supplier balance — PHASE 2 ME HAT GAYI ✅
```

---

## Supplier Statistics — Kya Update Hoti Hai

```javascript
// createPurchase me likely yahi hoga:
supplier.statistics.totalOrders += 1;
supplier.statistics.totalPurchaseValue += purchase.financials.grandTotal;
supplier.statistics.lastOrderDate = new Date();
await supplier.save();

// receivePurchase me:
supplier.statistics.completedOrders += 1;
await supplier.save();
```

---

## Plan — Same Pattern Jo Sales Me Kiya

```
Supplier.js me statics add karo:
  → recordPurchaseOrder()   — order create hone pe
  → recordPurchaseReceived() — purchase receive hone pe

purchase.service.js me:
  → Supplier direct statistics update HATAO
  → Supplier.recordPurchaseOrder() LAGAO
  → Supplier.recordPurchaseReceived() LAGAO
```

---

## Files Jo Change Hongi

```
1. src/models/Supplier.js
   → recordPurchaseOrder() static add karo
   → recordPurchaseReceived() static add karo

2. src/api/purchase/purchase.service.js
   → Supplier direct statistics update HATAO
   → Supplier statics call karo
```

---

## Lekin Pehle Purchase Service Dikhao

```
Purchase service dekhe bina exact changes
nahi bata sakta.

Ho sakta hai:
  - Statistics update ho rahi ho
  - Na ho rahi ho (already clean ho)
  - Kuch aur bhi direct update ho raha ho

Purchase service do — tab exact
before/after bataunga.
```

---

## Summary

```
Phase 6 Goal:
  Purchase service Supplier ki internals se
  aazad ho jaye

Approach:
  Supplier model me statics banao
  Purchase service unhe call kare

Expected Files: 2
  Supplier.js + purchase.service.js

Risk: Kam — same pattern jo pehle kar chuke hain
```