# Phase 3 — Inventory Domain

---

## Kya Problem Hai Abhi

```
Sales Service    → Product stock directly ghatata hai
Purchase Service → Product stock directly badhata hai
Product Service  → InventoryTransaction directly create karta hai

Koi central control nahi.
```

---

## Phase 3 Ka Goal

```
Ek alag Inventory Domain banana

Jo sirf ye kaam kare:
- Stock badhana
- Stock ghatana
- Stock track karna
- Movement record karna

Sales/Purchase ko stock ki
chinta nahi hogi.
```

---

## Nai Files Jo Banegi

```
src/api/inventory/
├── inventory.service.js   ← naya
└── inventory.constants.js ← naya
```

---

## Existing Files Jo Update Hongi

```
src/api/sales/
└── sales.service.js       ← inventory logic hatega

src/api/purchase/
└── purchase.service.js    ← inventory logic hatega

src/api/product/
└── product.service.js     ← InventoryTransaction
                              direct create hatega
```

---

## Inventory Service Kya Kya Karega

```
5 kaam sirf:

1. decreaseStock()
   Sale pe call hoga

2. increaseStock()
   Purchase pe call hoga

3. returnStock()
   Return pe call hoga

4. adjustStock()
   Manual adjustment pe

5. getStockMovement()
   History dekhne ke liye
```

---

## Flow Kaisa Hoga

```
Pehle:
Sales Service
   ↓
Product.updateStock()    ← direct
InventoryTransaction.create() ← direct

Baad me:
Sales Service
   ↓
InventoryService.decreaseStock()
   ↓
Product.updateStock()
InventoryTransaction.create()
```

---

## Kya Nahi Badlega

```
❌ Controllers touch nahi honge
❌ Routes touch nahi honge
❌ Models touch nahi honge
❌ Validation touch nahi hogi
```

---

## Phase 3 Complete Hone Ki Pehchan

```
✅ inventory.service.js ready
✅ Sales service me direct
   stock update nahi ho raha
✅ Purchase service me direct
   stock update nahi ho raha
✅ Product service me direct
   InventoryTransaction nahi
✅ Sab inventory.service
   se ho raha hai
```

---

## Sequence

```
Step 1: inventory.constants.js banao
Step 2: inventory.service.js banao
Step 3: sales.service.js update karo
Step 4: purchase.service.js update karo
Step 5: product.service.js update karo
Step 6: Test karo
```

---

Ready ho toh bolo — Phase 3 shuru karte hain.