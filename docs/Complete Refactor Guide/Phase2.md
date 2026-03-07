# PHASE 2 — Ledger Domain Banana

---

## Pehle Samjho — Ledger Kya Hota Hai

```
Abhi ka system:
Customer.totalDue = directly store karo

Ledger system:
Har transaction record karo
Balance = calculate karo entries se
```

Simple analogy:
Bank passbook ki tarah. Har entry likhi hoti hai. Balance automatically calculate hota hai.

---

## Kyun Pehle Ledger

```
Kyunki:

Sales fix karo    → customer balance kaun update kare?
Payment fix karo  → customer balance kaun update kare?
Purchase fix karo → supplier balance kaun update kare?

Answer sab jagah:
LEDGER SERVICE
```

Ledger pehle bana — baaki sab easy ho jayega.

---

## Ledger Domain Structure

```
src/
└── api/
    └── ledger/
        ├── ledger.model.js       ← naya model
        ├── ledger.service.js     ← naya service
        └── ledger.constants.js   ← entry types
```

---

## Ledger Kya Kya Karega

```
SIRF YE KAAM:

1. Debit entry create karna
   (customer pe amount badhna — wo humara debtor)

2. Credit entry create karna
   (customer ne pay kiya — balance kam hona)

3. Balance calculate karna
   (entries se — stored value se nahi)

4. Party ka ledger dikhana
   (customer ya supplier ki saari entries)
```

---

## Ledger Entry Kaise Dikhegi

```
Entry 1:
  party    → Customer A
  type     → DEBIT
  amount   → 50,000
  reason   → Sale created (INV-001)
  date     → today

Entry 2:
  party    → Customer A
  type     → CREDIT
  amount   → 30,000
  reason   → Payment received (PAY-001)
  date     → today

Balance  → 50,000 - 30,000 = 20,000 DUE
```

Balance manually store nahi kiya. Calculate hua entries se.

---

## Koi Bhi Service Directly Balance Update Nahi Karegi

```
❌ Pehle:
Sales Service → customer.totalDue += amount

✅ Baad me:
Sales Service → LedgerService.createDebit(customerId, amount, reference)
```

---

## Phase 2 Karne Ke Steps

```
Step 1:
Ledger model banao
(model ka structure clear karo)

Step 2:
Ledger service banao
(sirf 4 functions — debit, credit, balance, history)

Step 3:
Sales service me test karo
(ek jagah replace karo pehle)

Step 4:
Sab jagah replace karo
(Sales, Payment, Purchase)

Step 5:
Customer model se totalDue hatao
(ab ledger calculate karega)
```

---

## Important Rules Ledger Ke Liye

```
Rule 1:
Ledger entry kabhi delete nahi hogi
Sirf reverse entry hogi

Rule 2:
Har entry me reference hoga
(Sale ID, Payment ID, Purchase ID)

Rule 3:
Balance = SUM(credits) - SUM(debits)
Stored value nahi

Rule 4:
Ledger service kisi aur service ko
import nahi karegi
Completely independent rahegi
```

---

## Iske Baad Kya Hoga

```
Pehle:
Sales   → customer balance update  ← 3 jagah
Payment → customer balance update  ← duplicate
Returns → customer balance update  ← scattered

Baad me:
Sales   → Ledger.debit()
Payment → Ledger.credit()
Returns → Ledger.reverse()

Ek jagah. Ek control.
```