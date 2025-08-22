// Restaurant Management System Frontend

let currentSection = "tables";
let tables = [];
let menuItems = [];
let orders = [];

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  loadTables();
  loadMenuItems();
  loadOrders();
});

// Section management
function showSection(section) {
  document
    .querySelectorAll(".section")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById(`${section}-section`).style.display = "block";
  currentSection = section;

  // Refresh data when switching sections
  if (section === "tables") loadTables();
  else if (section === "menu") loadMenuItems();
  else if (section === "orders") loadOrders();
}

// Tables functionality
async function loadTables() {
  try {
    const response = await fetch("/api/tables");
    tables = await response.json();
    renderTables();
  } catch (error) {
    console.error("Error loading tables:", error);
  }
}

function renderTables() {
  const grid = document.getElementById("tables-grid");
  grid.innerHTML = tables
    .map(
      (table) => `
        <div class="col-md-3 col-sm-6">
            <div class="table-card ${
              table.status
            }" onclick="toggleTableStatus(${table.id})">
                <div class="table-number">Table ${table.table_number}</div>
                <div class="capacity">Capacity: ${table.capacity}</div>
                <div class="status-badge">
                    <span class="badge bg-${getStatusColor(
                      table.status
                    )}">${table.status.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function getStatusColor(status) {
  const colors = {
    available: "success",
    occupied: "danger",
    reserved: "warning",
    cleaning: "secondary",
  };
  return colors[status] || "secondary";
}

async function toggleTableStatus(tableId) {
  const table = tables.find((t) => t.id === tableId);
  const statuses = ["available", "occupied", "reserved", "cleaning"];
  const currentIndex = statuses.indexOf(table.status);
  const newStatus = statuses[(currentIndex + 1) % statuses.length];

  try {
    const response = await fetch(`/api/tables/${tableId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      table.status = newStatus;
      renderTables();
    }
  } catch (error) {
    console.error("Error updating table status:", error);
  }
}

// Menu functionality
async function loadMenuItems() {
  try {
    const response = await fetch("/api/menu");
    menuItems = await response.json();
    renderMenuItems();
  } catch (error) {
    console.error("Error loading menu items:", error);
  }
}

function renderMenuItems() {
  const container = document.getElementById("menu-items");
  const groupedItems = groupBy(menuItems, "category");

  container.innerHTML = Object.keys(groupedItems)
    .map(
      (category) => `
        <div class="col-12">
            <h4 class="mt-4 mb-3">${category}</h4>
            <div class="row">
                ${groupedItems[category]
                  .map(
                    (item) => `
                    <div class="col-md-6 col-lg-4">
                        <div class="menu-item-card">
                            <h5>${item.name}</h5>
                            <p class="text-muted">${item.description || ""}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="price-tag">$${item.price}</span>
                                <div>
                                    <span class="badge bg-${
                                      item.available ? "success" : "danger"
                                    }">
                                        ${
                                          item.available
                                            ? "Available"
                                            : "Unavailable"
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `
    )
    .join("");
}

function showAddMenuModal() {
  document.getElementById("menuForm").reset();
  new bootstrap.Modal(document.getElementById("menuModal")).show();
}

async function saveMenuItem() {
  const formData = {
    name: document.getElementById("itemName").value,
    description: document.getElementById("itemDescription").value,
    price: parseFloat(document.getElementById("itemPrice").value),
    category: document.getElementById("itemCategory").value,
    available: true,
  };

  try {
    const response = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById("menuModal")).hide();
      loadMenuItems();
    }
  } catch (error) {
    console.error("Error saving menu item:", error);
  }
}

// Orders functionality
async function loadOrders() {
  try {
    const response = await fetch("/api/orders");
    const orderData = await response.json();
    orders = processOrderData(orderData);
    renderOrders();
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

function processOrderData(data) {
  const ordersMap = {};

  data.forEach((row) => {
    if (!ordersMap[row.id]) {
      ordersMap[row.id] = {
        id: row.id,
        table_id: row.table_id,
        customer_name: row.customer_name,
        status: row.status,
        total: row.total,
        created_at: row.created_at,
        items: [],
      };
    }

    if (row.menu_item_id) {
      ordersMap[row.id].items.push({
        name: row.item_name,
        quantity: row.quantity,
        price: row.price,
      });
    }
  });

  return Object.values(ordersMap);
}

function renderOrders() {
  const container = document.getElementById("orders-list");
  container.innerHTML = orders
    .map(
      (order) => `
        <div class="order-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h5>Order #${order.id}</h5>
                    <p class="mb-1">Table: ${order.table_id} | Customer: ${
        order.customer_name || "Walk-in"
      }</p>
                    <small class="text-muted">${new Date(
                      order.created_at
                    ).toLocaleString()}</small>
                </div>
                <div>
                    <span class="order-status status-${
                      order.status
                    }">${order.status.toUpperCase()}</span>
                    <select class="form-select form-select-sm mt-2" onchange="updateOrderStatus(${
                      order.id
                    }, this.value)">
                        <option value="pending" ${
                          order.status === "pending" ? "selected" : ""
                        }>Pending</option>
                        <option value="preparing" ${
                          order.status === "preparing" ? "selected" : ""
                        }>Preparing</option>
                        <option value="ready" ${
                          order.status === "ready" ? "selected" : ""
                        }>Ready</option>
                        <option value="served" ${
                          order.status === "served" ? "selected" : ""
                        }>Served</option>
                        <option value="paid" ${
                          order.status === "paid" ? "selected" : ""
                        }>Paid</option>
                    </select>
                </div>
            </div>
            <div class="order-items">
                ${order.items
                  .map(
                    (item) => `
                    <div class="d-flex justify-content-between">
                        <span>${item.quantity}x ${item.name}</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `
                  )
                  .join("")}
            </div>
            <hr>
            <div class="d-flex justify-content-between">
                <strong>Total: $${order.total}</strong>
            </div>
        </div>
    `
    )
    .join("");
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (response.ok) {
      loadOrders();
    }
  } catch (error) {
    console.error("Error updating order status:", error);
  }
}

// Utility functions
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}
