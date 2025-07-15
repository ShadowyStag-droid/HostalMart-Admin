import { db, auth } from './firebaseConfig.js';
import {
  collection, getDocs, addDoc, deleteDoc, updateDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_EMAIL = "sushan.kumar@hostel.com";

document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-content");
  const logoutBtn = document.getElementById("logoutBtn");
  const form = document.getElementById("product-form");
  const productsEl = document.getElementById("productsContainer");
  const ordersEl = document.getElementById("ordersContainer");
  const clearAllBtn = document.getElementById("clearAllOrdersBtn");

  // Login
  loginSection.querySelector("form").onsubmit = e => {
    e.preventDefault();
    const email = loginSection.querySelector("input[name=email]").value;
    const pass = loginSection.querySelector("input[name=password]").value;
    signInWithEmailAndPassword(auth, email, pass)
      .then(() => loginSection.querySelector("form").reset())
      .catch(err => alert("Login failed: " + err.message));
  };

  // Logout
  logoutBtn.onclick = () => signOut(auth);

  // Auth state check
  onAuthStateChanged(auth, user => {
    const isAdmin = user?.email === ADMIN_EMAIL;
    loginSection.classList.toggle("hidden", isAdmin);
    dashboard.classList.toggle("hidden", !isAdmin);
    logoutBtn.classList.toggle("hidden", !isAdmin);

    if (isAdmin) {
      loadProducts();
      loadOrders();
    } else if (user) {
      signOut(auth);
    }
  });

  // Load products
  function loadProducts() {
    onSnapshot(collection(db, "products"), snap => {
      productsEl.innerHTML = "";
      snap.forEach(docSnap => {
        const p = docSnap.data();
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="product-img" alt="${p.name}">` : ""}
          <h3>${p.name}</h3>
          <p>₹${p.price}</p>
          <p>Category: ${p.category}</p>
          <div style="display:flex; gap:8px; justify-content:center; margin-top:10px;">
            <button class="nav-btn edit-btn" data-id="${docSnap.id}">Edit</button>
            <button class="nav-btn danger-btn delete-btn" data-id="${docSnap.id}">Delete</button>
          </div>
        `;
        productsEl.appendChild(card);
      });

      productsEl.querySelectorAll(".delete-btn").forEach(btn => {
        btn.onclick = () => deleteDoc(doc(db, "products", btn.dataset.id));
      });

      productsEl.querySelectorAll(".edit-btn").forEach(btn => {
        btn.onclick = async () => {
          const snap = await getDocs(collection(db, "products"));
          snap.forEach(d => {
            if (d.id === btn.dataset.id) {
              const data = d.data();
              form.name.value = data.name;
              form.price.value = data.price;
              form.category.value = data.category;
              form.imageUrl.value = data.imageUrl || "";
              form.productId.value = d.id;
            }
          });
        };
      });
    });
  }

  // Add/Edit product
  form.onsubmit = async e => {
    e.preventDefault();
    const name = form.name.value;
    const price = parseFloat(form.price.value);
    const category = form.category.value;
    const imageUrl = form.imageUrl.value;
    const id = form.productId.value;
    const data = { name, price, category, imageUrl };

    if (id) {
      await updateDoc(doc(db, "products", id), data);
    } else {
      await addDoc(collection(db, "products"), data);
    }
    form.reset();
  };

  // Load orders
  function loadOrders() {
    onSnapshot(collection(db, "orders"), snap => {
      ordersEl.innerHTML = "";
      snap.forEach(docSnap => {
        const o = docSnap.data();
        const items = o.cart.map(i =>
          `<li>${i.name} (x${i.quantity}) – ₹${i.price * i.quantity}</li>`
        ).join("");
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
          <h3>${o.name} — Room ${o.room}</h3>
          <p>📞 ${o.mobile}</p>
          <ul>${items}</ul>
          <p><strong>Total:</strong> ₹${o.total}</p>
          <select class="status-select" data-id="${docSnap.id}">
            <option value="Pending" ${o.status==="Pending"?"selected":""}>Pending</option>
            <option value="Delivered" ${o.status==="Delivered"?"selected":""}>Delivered</option>
          </select>
        `;
        ordersEl.appendChild(card);
      });

      ordersEl.querySelectorAll(".status-select").forEach(sel => {
        sel.onchange = () =>
          updateDoc(doc(db, "orders", sel.dataset.id), { status: sel.value });
      });
    });
  }

  // Mark all delivered
  clearAllBtn.onclick = async () => {
    if (!confirm("Mark ALL orders as Delivered?")) return;
    const snap = await getDocs(collection(db, "orders"));
    await Promise.all(
      snap.docs.map(d => updateDoc(doc(db, "orders", d.id), { status: "Delivered" }))
    );
    alert("All marked delivered.");
  };
});





