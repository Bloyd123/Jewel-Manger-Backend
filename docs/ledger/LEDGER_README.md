# Ledger Module — Developer Guide

> **Yeh file kyun?**
> Taaki koi bhi naya developer aake seedha samjhe — ledger kya hai, kaise kaam karta hai, aur code mein kya ho raha hai. Ek baar padha toh poori picture clear.

> 🎯 **Interactive Visualization bhi hai!**
> Browser mein open karo: [ledger_visual.html](./ledger_visual.html)
> Double Entry flow, Live Ledger, Shop Balance, aur Concepts — sab ek jagah!

---

## Table of Contents

1. [Ledger kya hota hai?](#1-ledger-kya-hota-hai)
2. [Double Entry System](#2-double-entry-system)
3. [Constants](#3-constants)
4. [Model (ledger.model.js)](#4-model-ledgermodeljs)
5. [Service Functions (ledger.service.js)](#5-service-functions-ledgerservicejs)
6. [Real Life Examples](#6-real-life-examples)

---

## 1. Ledger kya hota hai?

Socho tumhare paas ek **register (copy)** hai jisme shop ka har lena-dena likha hota hai.

```
Customer ne ring kharidi     → ₹10,000 aaya
Supplier ko payment kiya     → ₹5,000  gaya
Customer ne advance diya     → ₹2,000  aaya
```

Yeh sab ek jagah record karna = **Ledger**.

Is project mein ledger kaam karta hai:
- Customer ne kitna kharida, kitna diya → track karna
- Supplier ko kitna dena hai → track karna
- Shop mein Cash/Bank balance kitna hai → track karna

---

## 2. Double Entry System

**Sabse important concept** — har transaction mein **2 entries** hoti hain.

### Rule
```
Jo LEGA   → DEBIT
Jo DEGA   → CREDIT
```

### Examples

**Customer ne ₹15,000 ki necklace kharidi (cash mein):**

| Account  | Entry  | Kyun                        |
|----------|--------|-----------------------------|
| Customer | DEBIT  | Usne cheez li               |
| CASH     | CREDIT | Shop mein paisa aaya        |

**Customer ne ₹5,000 payment diya:**

| Account  | Entry  | Kyun                        |
|----------|--------|-----------------------------|
| CASH     | DEBIT  | Shop mein cash aaya         |
| Customer | CREDIT | Uski debt kam hui           |

**Balance calculate karna:**
```
Customer Balance = Total DEBIT - Total CREDIT
                 = ₹15,000 - ₹5,000
                 = ₹10,000 (abhi bhi baaki hai)
```

### Cash vs Bank
- Customer ne **cash diya** → CASH account mein entry
- Customer ne **UPI/Card se diya** → BANK account mein entry

### Kyun Delete nahi karte?
Ledger mein entries **kabhi delete nahi hoti** — accounting ka golden rule hai yeh. Galat entry ko `reverseEntry` se cancel karte hain. Isse **audit trail** bana rehta hai — poori history safe rehti hai.

---

## 3. Constants

**File:** `ledger.constants.js`

Constants isliye use karte hain taaki hardcoded strings na likhni pade — typo se bache aur code safe rahe.

```js
// ❌ Bura tarika
entryType: 'debit'   // typo ho sakti hai

// ✅ Achha tarika
entryType: LEDGER_ENTRY_TYPES.DEBIT   // safe
```

### `LEDGER_ENTRY_TYPES`
```js
{ DEBIT: 'debit', CREDIT: 'credit' }
```

### `LEDGER_PARTY_TYPES`
```js
{
  CUSTOMER: 'customer',       // jo khareedte hain
  SUPPLIER: 'supplier',       // jisse tum khareedte ho
  CASH: 'cash',               // cash payments
  BANK: 'bank',               // UPI/card/bank transfer
  CHEQUE_CLEARING: 'cheque_clearing'  // cheque pending phase
}
```

### `LEDGER_STATUS`
```js
{ ACTIVE: 'active', REVERSED: 'reversed' }
```
- `ACTIVE` → entry valid hai
- `REVERSED` → entry galat thi, cancel kar di

### `LEDGER_REFERENCE_TYPES`
Har entry kis cheez ki wajah se bani — yeh batata hai:
```js
{
  SALE, PURCHASE, PAYMENT, RETURN,
  ADJUSTMENT, ADVANCE, REFUND, OPENING_BALANCE
}
```

---

## 4. Model (ledger.model.js)

MongoDB schema-less hota hai — isliye Mongoose use karte hain structure define karne ke liye.

### Important Fields

#### `partyType` — enum validation
```js
partyType: {
  type: String,
  enum: Object.values(LEDGER_PARTY_TYPES),  // sirf allowed values
}
```
`Object.values(LEDGER_PARTY_TYPES)` = `['customer', 'supplier', 'cash', 'bank', 'cheque_clearing']`

Agar `partyType: 'random'` diya → MongoDB reject kar dega.

#### `partyId` + `partyModel` — Dynamic Reference (refPath)
```js
partyId: {
  type: mongoose.Schema.Types.ObjectId,
  refPath: 'partyModel',   // dynamic collection
},
partyModel: {
  type: String,
  enum: ['Customer', 'Supplier', 'JewelryShop'],
}
```

**`ref` vs `refPath`:**

| | `ref` | `refPath` |
|---|---|---|
| Collection | Fixed — sirf ek | Dynamic — field ki value dekhta hai |
| Use case | Hamesha same collection | Kabhi Customer, kabhi Supplier |

```
partyModel = 'Customer'   → Customer collection mein jaata hai
partyModel = 'Supplier'   → Supplier collection mein jaata hai
partyModel = 'JewelryShop'→ JewelryShop collection mein jaata hai
```

#### Indexes — Fast Queries
```js
ledgerSchema.index({ shopId: 1, partyId: 1, entryDate: -1 });
ledgerSchema.index({ shopId: 1, partyType: 1, status: 1 });
```

- `1` = Ascending, `-1` = Descending
- **Compound Index** = ek saath multiple fields index hone se query fast hoti hai
- `entryDate: -1` → latest entries pehle (user ko nayi transactions pehle dikhti hain)

---

## 5. Service Functions (ledger.service.js)

### `createDebitEntry` / `createCreditEntry`

DEBIT ya CREDIT entry banata hai database mein.

```js
await createDebitEntry({
  organizationId, shopId,
  partyType: LEDGER_PARTY_TYPES.CUSTOMER,
  partyId: customer._id,
  partyModel: 'Customer',
  partyName: 'Rahul Sharma',
  amount: 15000,
  referenceType: LEDGER_REFERENCE_TYPES.SALE,
  referenceId: sale._id,
  description: 'Necklace sale',
  createdBy: userId,
  session,   // MongoDB transaction ke liye
});
```

**`session` parameter kyun?**

Ek sale mein 2 entries ek saath banani hoti hain (Customer DEBIT + CASH CREDIT). Agar beech mein error aa jaye toh incomplete state na bane — isliye MongoDB Transaction use karte hain.

```
session hai  → transaction ke andar save hoga (ya dono ya koi nahi)
session nahi → normal save hoga
```

**`entry[0]` kyun return karte hain?**

`LedgerEntry.create([...])` array mein data pass hota hai (session ke liye) → array return karta hai → `entry[0]` se pehla element lete hain.

---

### `getPartyBalance`

Kisi bhi party (customer/supplier) ka balance calculate karta hai — MongoDB Aggregation Pipeline use karke.

```js
const balance = await getPartyBalance({ partyId, shopId });
// returns: { totalDebit, totalCredit, balance }
```

**Pipeline steps:**

```
$match → sirf us party ki active entries filter karo
  ↓
$group → saari entries mein se totalDebit aur totalCredit sum karo
  ↓
$project → balance = totalDebit - totalCredit calculate karo
```

**`$cond` ka kaam (if-else):**
```js
$cond: [
  { $eq: ['$entryType', 'debit'] },  // agar debit hai
  '$amount',                          // toh amount lo
  0                                   // warna 0 lo
]
```

**`_id: null` kyun?**
Saare documents ko ek hi group mein daalo — koi alag grouping nahi, sirf ek total result chahiye.

**`new mongoose.Types.ObjectId(partyId)` kyun?**
`partyId` string ke roop mein aata hai, lekin MongoDB ObjectId format mein store hota hai — isliye convert karna padta hai.

---

### `getCashBalance` / `getBankBalance`

Shop ka cash drawer ya bank account balance dekhta hai.

```js
const cash = await getCashBalance(shopId);
const bank = await getBankBalance(shopId);
```

`getPartyBalance` jaisa hi hai — sirf `partyId` nahi hota kyunki Cash/Bank ek specific party nahi, poori shop ka internal account hai. Sirf `partyType: CASH` ya `BANK` se filter hota hai.

---

### `getPartyLedger`

Party ki transactions paginated form mein return karta hai.

```js
const result = await getPartyLedger({ partyId, shopId, page: 1, limit: 20 });
// returns: { entries, total, page, totalPages }
```

**Pagination:**
```js
const skip = (page - 1) * limit;
// page 1 → skip 0  → entries 1-20
// page 2 → skip 20 → entries 21-40
// page 3 → skip 40 → entries 41-60
```

**`Math.ceil` kyun?**
```js
totalPages: Math.ceil(total / limit)
// 45 entries / 20 per page = 2.25 → Math.ceil = 3 pages
```

**`Promise.all` kyun?**
```js
const [entries, total] = await Promise.all([
  LedgerEntry.find(...),         // query 1
  LedgerEntry.countDocuments(..) // query 2
]);
// Dono ek saath chalte hain → time bachta hai (200ms → 100ms)
```

---

### `reverseEntry`

Galat entry ko cancel karta hai — delete nahi, reverse karta hai.

```js
await reverseEntry({ entryId, createdBy, description, session });
```

**Flow:**
1. Original entry find karo — exist karti hai? Already reversed toh nahi?
2. Opposite type ki entry banao:
   ```
   Original DEBIT  → Reverse CREDIT
   Original CREDIT → Reverse DEBIT
   ```
3. Original entry ko `REVERSED` status mark karo (delete nahi)

**Kyun delete nahi?**
Ledger mein audit trail hoti hai — delete kiya toh proof gone. `REVERSED` status se history bhi rahti hai aur entry cancel bhi ho jaati hai.

---

## 6. Real Life Examples

### Example 1 — Customer ne UPI se necklace kharidi

```js
// Step 1: Customer pe DEBIT (cheez li)
await createDebitEntry({
  partyType: LEDGER_PARTY_TYPES.CUSTOMER,
  partyId: customer._id,
  amount: 15000,
  referenceType: LEDGER_REFERENCE_TYPES.SALE,
  session,
});

// Step 2: BANK pe CREDIT (UPI se paisa aaya)
await createCreditEntry({
  partyType: LEDGER_PARTY_TYPES.BANK,
  partyId: shopId,
  amount: 15000,
  referenceType: LEDGER_REFERENCE_TYPES.SALE,
  session,
});
```

### Example 2 — Supplier se sona kharida (baad mein payment)

| Account   | Entry  | Kyun                    |
|-----------|--------|-------------------------|
| Inventory | DEBIT  | Shop ne sona liya       |
| Supplier  | CREDIT | Supplier ne sona diya   |

### Example 3 — Balance check

```js
const { totalDebit, totalCredit, balance } = await getPartyBalance({
  partyId: customer._id,
  shopId,
});
// balance = 15000 - 5000 = ₹10,000 baaki
```

---

> **Summary:** Double Entry = Jo lega DEBIT, Jo dega CREDIT. Har transaction 2 entries banata hai. Entries kabhi delete nahi hoti — sirf reverse hoti hain.