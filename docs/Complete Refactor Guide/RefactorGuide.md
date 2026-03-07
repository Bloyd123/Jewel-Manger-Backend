Suno pehle ek important baat:

**Code likhne se pehle — sirf samjho. Ek ek step pe.**

---

## Complete Refactor Guide

---

### PHASE 1 — Samjho kya hai abhi (1-2 din)

Karo kya:
- Apne saare service files kholo
- Ek paper pe likho — kaun sa service kaun kaun sa model import kar raha hai
- Dependency map banao mentally

Goal: Puri picture clear ho jaye. Code mat chhuo abhi.

---

### PHASE 2 — Ledger Domain Banao (Sabse Pehle)

Kyun pehle:
Kyunki customer balance, supplier balance — sab iska dependant hai. Ye theek hua toh baaki automatically simple ho jayega.

Kya karna hai:
- Ek alag `ledger.service.js` banao
- Sirf do kaam karega — debit entry, credit entry
- Balance calculate karega entries se — stored value se nahi

Koi aur service directly customer balance update nahi karegi.

---

### PHASE 3 — Inventory Domain Isolate Karo

Kya karna hai:
- Ek alag `inventory.service.js` banao
- Sirf ye stock badhayega, ghatayega, track karega
- Sales service directly Product model ko touch nahi karegi
- Sales bolegi inventory service ko — "ye quantity ghatao"

---

### PHASE 4 — Payment Decouple Karo

Kya karna hai:
- Payment service se Sale, Purchase, Customer, Supplier imports hatao
- Payment sirf ye accept kare — amount, partyId, partyType, referenceId, referenceType
- Sale complete hone ke baad — Sale service khud payment trigger kare
- Payment ko sale ka internal structure nahi pata hona chahiye

---

### PHASE 5 — Sales Service Thin Karo

Kya karna hai:
- Sales service sirf sale workflow handle kare
- Stock update — Inventory service ko do
- Balance update — Ledger service ko do
- Payment — Payment service ko do
- Sales service sirf coordinate kare

---

### PHASE 6 — Purchase Service Thin Karo

Same as Phase 5 — Purchase ke liye.

---

### PHASE 7 — Test Karo Har Step Pe

Har phase ke baad:
- Ek sale create karo
- Check karo stock ghat
- Check karo balance update hua
- Check karo payment bana
- Sab consistent hai

Aage mat badho jab tak current phase stable nahi ho.

---

### Order Summary:

```
1. Ledger Domain
2. Inventory Domain  
3. Payment Decouple
4. Sales Thin
5. Purchase Thin
6. Test everything
```

---
