## Phase 4 — Payment Decouple

---

## Abhi Kya Problem Hai

```javascript
// payment.service.js me abhi bhi ye imports hain:
import Sale from '../../models/Sale.js';
import Purchase from '../../models/Purchase.js';

// Ye function inhe use karta hai:
updateReferencePaymentStatus()
```

---

## Ye Function Kya Karta Hai

```javascript
// Sale ya Purchase ka paymentStatus update karta hai
// jab payment aata hai

const updateReferencePaymentStatus = async (referenceType, referenceId, paymentData) => {
  if (referenceType === 'sale') {
    const sale = await Sale.findById(referenceId);
    sale.payment.paymentStatus = paymentData.status;
    await sale.save();
  } else if (referenceType === 'purchase') {
    const purchase = await Purchase.findById(referenceId);
    purchase.payment.paymentStatus = paymentData.status;
    await purchase.save();
  }
};
```

---

## Problem Kyun Hai

```
Payment Service ko Sale aur Purchase ki
internal structure pata honi chahiye — ye galat hai.

Payment service ko sirf ye pata hona chahiye:
"Maine payment process kar diya"

Sale/Purchase ko khud update karna chahiye
jab unhe pata chale ki payment hua.
```

---

## Phase 4 Ka Goal

```
Payment Service
   ↓
Sale/Purchase import HATAO
   ↓
updateReferencePaymentStatus HATAO payment.service se
```

---

## 2 Options Hain

### Option A — Sale/Purchase Service Ko Responsibility Do

```
Payment process ho → 
Sale Service ka function call karo →
Sale apna status update kare

Payment process ho →
Purchase Service ka function call karo →
Purchase apna status update kare
```

**Problem:** Circular dependency ban sakti hai.
```
payment.service → sale.service → payment.service ❌
```

---

### Option B — Sale/Purchase Service Payment Service Ko Call Kare

```
Sale Service:
  addPayment() →
    payment.service.processPayment() call karo →
    payment return aaya →
    sale apna status khud update kare

Purchase Service:
  addPayment() →
    payment.service.processPayment() call karo →
    payment return aaya →
    purchase apna status khud update kare
```

**Ye sahi approach hai** — Payment service clean rahega.

---

## Kya Badlega

```
payment.service.js:
  Sale import        → HATAO
  Purchase import    → HATAO
  updateReferencePaymentStatus → HATAO ya simplify karo

sales.service.js:
  addPayment() →
    payment complete hone ke baad
    sale.payment.paymentStatus update karo khud

purchase.service.js:
  addPayment() →
    payment complete hone ke baad
    purchase.payment.paymentStatus update karo khud
```

---

## Lekin Ek Reality Check

```
Tumhara payment.service.js dekha nahi abhi.
updateReferencePaymentStatus exactly kya karta hai
wo dekhne ke baad final plan banenge.

Ho sakta hai:
- Simple status update ho → easy fix
- Complex logic ho → careful refactor chahiye
```

---

## Summary

```
Phase 4 Goal:
  Payment Service → Sale/Purchase se independent ho jaye

Approach:
  Sale/Purchase service apna payment status
  khud manage kare

Risk:
  Circular dependency — carefully handle karna hoga

Next Step:
  payment.service.js do → exact changes bataunga
```
