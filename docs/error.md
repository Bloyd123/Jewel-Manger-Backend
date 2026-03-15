<!-- in the invetory -->
## returnStock 
// Return ke baad hona chahiye tha:
product.saleStatus = 'available'  // sold → available
product.soldTo = null             // customer clear
product.soldDate = null           // date clear
```

Lekin `returnStock` mein yeh kuch bhi nahi hai — sirf stock add ho raha hai!

Iska matlab:
```
Customer ne ring wapas ki ✅
Stock 0 → 1 ho gaya ✅
lekin saleStatus abhi bhi 'sold' ❌
Ring dobaara sale ke liye available nahi dikhegi! ❌
## 2 bug
# issme productcode bhi genrate kaar rhe hai 