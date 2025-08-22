// Restaurant Management System Frontend

let currentSection = "tables";
let tables = [];
let menuItems = [];
let orders = [];
let recipes = [];
let availableRecipes = [];
let products = [];
let inventoryAlerts = { lowStock: [], outOfStock: [] };
let inventoryTransactions = [];
let recipeLinks = [];

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  loadTables();
  loadMenuItems();
  loadOrders();
  loadRecipes();
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
  else if (section === "recipes") loadRecipes();
  else if (section === "inventory") loadInventoryData();
  else if (section === "database") checkDatabaseStatus();
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

// Order creation functionality
let selectedItems = [];

function showNewOrderModal() {
  // Reset form and selected items
  document.getElementById("orderForm").reset();
  selectedItems = [];
  updateOrderSummary();

  // Populate tables dropdown
  populateTablesDropdown();

  // Populate menu items for selection
  populateMenuSelection();

  // Show modal
  new bootstrap.Modal(document.getElementById("orderModal")).show();
}

function populateTablesDropdown() {
  const tableSelect = document.getElementById("orderTable");
  tableSelect.innerHTML = '<option value="">Select Table</option>';

  tables.forEach((table) => {
    const option = document.createElement("option");
    option.value = table.id;
    option.textContent = `Table ${table.table_number} (${table.status})`;
    option.disabled = table.status === "cleaning";
    tableSelect.appendChild(option);
  });
}

function populateMenuSelection() {
  const container = document.getElementById("menu-selection");
  const groupedItems = groupBy(
    menuItems.filter((item) => item.available),
    "category"
  );

  container.innerHTML = Object.keys(groupedItems)
    .map(
      (category) => `
    <div class="mb-3">
      <h6 class="text-primary">${category}</h6>
      <div class="row">
        ${groupedItems[category]
          .map(
            (item) => `
          <div class="col-md-6 mb-2">
            <div class="card menu-select-card" onclick="toggleMenuItem(${
              item.id
            })">
              <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>${item.name}</strong>
                    <br><small class="text-muted">${
                      item.description || ""
                    }</small>
                  </div>
                  <div class="text-end">
                    <div class="price-tag">$${item.price}</div>
                    <div class="quantity-controls" id="qty-controls-${
                      item.id
                    }" style="display: none;">
                      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); changeQuantity(${
                        item.id
                      }, -1)">-</button>
                      <span class="mx-2" id="qty-${item.id}">1</span>
                      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); changeQuantity(${
                        item.id
                      }, 1)">+</button>
                    </div>
                  </div>
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

function toggleMenuItem(itemId) {
  const item = menuItems.find((m) => m.id === itemId);
  const existingIndex = selectedItems.findIndex(
    (s) => s.menu_item_id === itemId
  );

  if (existingIndex >= 0) {
    // Remove item
    selectedItems.splice(existingIndex, 1);
    document.getElementById(`qty-controls-${itemId}`).style.display = "none";
    document
      .querySelector(`[onclick="toggleMenuItem(${itemId})"]`)
      .classList.remove("selected");
  } else {
    // Add item
    selectedItems.push({
      menu_item_id: itemId,
      name: item.name,
      price: item.price,
      quantity: 1,
    });
    document.getElementById(`qty-controls-${itemId}`).style.display = "block";
    document
      .querySelector(`[onclick="toggleMenuItem(${itemId})"]`)
      .classList.add("selected");
  }

  updateOrderSummary();
}

function changeQuantity(itemId, change) {
  const itemIndex = selectedItems.findIndex((s) => s.menu_item_id === itemId);
  if (itemIndex >= 0) {
    selectedItems[itemIndex].quantity += change;
    if (selectedItems[itemIndex].quantity <= 0) {
      selectedItems.splice(itemIndex, 1);
      document.getElementById(`qty-controls-${itemId}`).style.display = "none";
      document
        .querySelector(`[onclick="toggleMenuItem(${itemId})"]`)
        .classList.remove("selected");
    } else {
      document.getElementById(`qty-${itemId}`).textContent =
        selectedItems[itemIndex].quantity;
    }
    updateOrderSummary();
  }
}

function updateOrderSummary() {
  const summaryContainer = document.getElementById("selected-items");
  const totalElement = document.getElementById("order-total");
  const saveBtn = document.getElementById("saveOrderBtn");

  if (selectedItems.length === 0) {
    summaryContainer.innerHTML = '<p class="text-muted">No items selected</p>';
    totalElement.textContent = "0.00";
    saveBtn.disabled = true;
  } else {
    summaryContainer.innerHTML = selectedItems
      .map(
        (item) => `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `
      )
      .join("");

    const total = selectedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    totalElement.textContent = total.toFixed(2);
    saveBtn.disabled = false;
  }
}

async function saveOrder() {
  const tableId = document.getElementById("orderTable").value;
  const customerName = document.getElementById("customerName").value;

  if (!tableId || selectedItems.length === 0) {
    alert("Please select a table and at least one menu item.");
    return;
  }

  const orderData = {
    table_id: parseInt(tableId),
    customer_name: customerName || null,
    items: selectedItems,
  };

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById("orderModal")).hide();
      loadOrders();
      // Update table status to occupied if it was available
      const table = tables.find((t) => t.id === parseInt(tableId));
      if (table && table.status === "available") {
        await fetch(`/api/tables/${tableId}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "occupied" }),
        });
        loadTables();
      }
    } else {
      alert("Error creating order. Please try again.");
    }
  } catch (error) {
    console.error("Error saving order:", error);
    alert("Error creating order. Please try again.");
  }
}

// Recipe functionality
async function loadRecipes() {
  try {
    const response = await fetch("/api/recipes");
    const data = await response.json();
    recipes = data.recipes || data;
    renderRecipes();

    // Also load available recipes for menu creation
    const availableResponse = await fetch("/api/menu/available-recipes");
    availableRecipes = await availableResponse.json();
  } catch (error) {
    console.error("Error loading recipes:", error);
  }
}

function renderRecipes() {
  const container = document.getElementById("recipes-list");
  const groupedRecipes = groupBy(recipes, "category");

  container.innerHTML = Object.keys(groupedRecipes)
    .map(
      (category) => `
    <div class="col-12">
      <h4 class="mt-4 mb-3">${
        category.charAt(0).toUpperCase() + category.slice(1)
      }</h4>
      <div class="row">
        ${groupedRecipes[category]
          .map(
            (recipe) => `
          <div class="col-md-6 col-lg-4">
            <div class="recipe-card">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5>${recipe.name}</h5>
                <span class="badge bg-${
                  recipe.already_in_menu ? "success" : "secondary"
                }">
                  ${recipe.already_in_menu ? "In Menu" : "Available"}
                </span>
              </div>
              <p class="text-muted">${recipe.description || ""}</p>
              <div class="recipe-meta mb-3">
                <small class="text-info">
                  ⏱️ ${recipe.prep_time || 0}min prep, ${
              recipe.cook_time || 0
            }min cook
                  <br>👥 Serves ${recipe.servings || 1}
                  ${recipe.difficulty ? `<br>⭐ ${recipe.difficulty}` : ""}
                </small>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" onclick="viewRecipe(${
                  recipe.id
                })">
                  View Details
                </button>
                ${
                  !recipe.already_in_menu
                    ? `
                  <button class="btn btn-sm btn-primary" onclick="createMenuFromRecipe(${recipe.id})">
                    Add to Menu
                  </button>
                `
                    : ""
                }
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
  populateRecipeDropdown();
  new bootstrap.Modal(document.getElementById("menuModal")).show();
}

function populateRecipeDropdown() {
  const recipeSelect = document.getElementById("itemRecipe");
  recipeSelect.innerHTML =
    '<option value="">Create standalone menu item</option>';

  availableRecipes.forEach((recipe) => {
    if (!recipe.already_in_menu) {
      const option = document.createElement("option");
      option.value = recipe.id;
      option.textContent = `${recipe.name} (${recipe.category})`;
      recipeSelect.appendChild(option);
    }
  });
}

function onRecipeSelect() {
  const recipeId = document.getElementById("itemRecipe").value;
  const recipeInfo = document.getElementById("recipe-info");
  const recipeDetails = document.getElementById("recipe-details");

  if (recipeId) {
    const recipe = availableRecipes.find((r) => r.id == recipeId);
    if (recipe) {
      // Auto-fill form with recipe data
      document.getElementById("itemName").value = recipe.name;
      document.getElementById("itemDescription").value =
        recipe.description || "";
      document.getElementById("itemCategory").value =
        recipe.category === "food" ? "Main Course" : "Beverages";

      // Show recipe info
      recipeDetails.innerHTML = `
        <strong>${recipe.name}</strong><br>
        <small>⏱️ ${recipe.prep_time || 0}min prep, ${
        recipe.cook_time || 0
      }min cook | 👥 Serves ${recipe.servings || 1}</small>
      `;
      recipeInfo.style.display = "block";
    }
  } else {
    recipeInfo.style.display = "none";
    // Clear auto-filled data
    document.getElementById("itemName").value = "";
    document.getElementById("itemDescription").value = "";
  }
}

async function saveMenuItem() {
  const formData = {
    recipe_id: document.getElementById("itemRecipe").value || null,
    name: document.getElementById("itemName").value,
    description: document.getElementById("itemDescription").value,
    price: parseFloat(document.getElementById("itemPrice").value),
    category: document.getElementById("itemCategory").value,
    cost_per_serving:
      parseFloat(document.getElementById("itemCost").value) || 0,
    profit_margin:
      parseFloat(document.getElementById("itemMargin").value) / 100 || 0.3,
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
      loadRecipes(); // Refresh to update "already_in_menu" status
    } else {
      const error = await response.json();
      alert("Error saving menu item: " + error.error);
    }
  } catch (error) {
    console.error("Error saving menu item:", error);
    alert("Error saving menu item. Please try again.");
  }
}

async function createMenuFromRecipe(recipeId) {
  const recipe = availableRecipes.find((r) => r.id === recipeId);
  if (!recipe) return;

  // Pre-fill modal with recipe data
  document.getElementById("itemRecipe").value = recipeId;
  document.getElementById("itemName").value = recipe.name;
  document.getElementById("itemDescription").value = recipe.description || "";
  document.getElementById("itemCategory").value =
    recipe.category === "food" ? "Main Course" : "Beverages";

  // Show recipe info
  const recipeInfo = document.getElementById("recipe-info");
  const recipeDetails = document.getElementById("recipe-details");
  recipeDetails.innerHTML = `
    <strong>${recipe.name}</strong><br>
    <small>⏱️ ${recipe.prep_time || 0}min prep, ${
    recipe.cook_time || 0
  }min cook | 👥 Serves ${recipe.servings || 1}</small>
  `;
  recipeInfo.style.display = "block";

  new bootstrap.Modal(document.getElementById("menuModal")).show();
}

async function viewRecipe(recipeId) {
  try {
    const response = await fetch(`/api/recipes/${recipeId}`);
    const data = await response.json();
    const recipe = data.recipe;

    // Create a modal to show recipe details
    const modalHtml = `
      <div class="modal fade" id="recipeViewModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${recipe.name}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p class="lead">${recipe.description || ""}</p>
              <div class="row mb-4">
                <div class="col-md-3">
                  <strong>Prep Time:</strong><br>${
                    recipe.prep_time || 0
                  } minutes
                </div>
                <div class="col-md-3">
                  <strong>Cook Time:</strong><br>${
                    recipe.cook_time || 0
                  } minutes
                </div>
                <div class="col-md-3">
                  <strong>Servings:</strong><br>${recipe.servings || 1}
                </div>
                <div class="col-md-3">
                  <strong>Difficulty:</strong><br>${
                    recipe.difficulty || "Not specified"
                  }
                </div>
              </div>
              
              ${
                recipe.ingredients && recipe.ingredients.length > 0
                  ? `
                <h6>Ingredients:</h6>
                <ul class="list-group mb-4">
                  ${recipe.ingredients
                    .map(
                      (ing) => `
                    <li class="list-group-item">
                      ${ing.quantity ? ing.quantity + " " : ""}${
                        ing.unit ? ing.unit + " " : ""
                      }${ing.name}
                      ${
                        ing.notes
                          ? `<small class="text-muted"> - ${ing.notes}</small>`
                          : ""
                      }
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              `
                  : ""
              }
              
              ${
                recipe.steps && recipe.steps.length > 0
                  ? `
                <h6>Instructions:</h6>
                <ol class="list-group list-group-numbered">
                  ${recipe.steps
                    .map(
                      (step) => `
                    <li class="list-group-item">
                      ${step.instruction}
                      ${
                        step.timing
                          ? `<br><small class="text-info">⏱️ ${step.timing} minutes</small>`
                          : ""
                      }
                    </li>
                  `
                    )
                    .join("")}
                </ol>
              `
                  : ""
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("recipeViewModal");
    if (existingModal) existingModal.remove();

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Show modal
    new bootstrap.Modal(document.getElementById("recipeViewModal")).show();
  } catch (error) {
    console.error("Error loading recipe details:", error);
    alert("Error loading recipe details.");
  }
}

// Recipe creation functionality
function showAddRecipeModal() {
  document.getElementById("recipeForm").reset();

  // Reset dynamic containers to have one empty row each
  document.getElementById("ingredients-container").innerHTML = `
    <div class="ingredient-row mb-2">
      <div class="row">
        <div class="col-md-4">
          <input type="text" class="form-control" placeholder="Ingredient name" name="ingredient-name" />
        </div>
        <div class="col-md-3">
          <input type="number" step="0.01" class="form-control" placeholder="Quantity" name="ingredient-quantity" />
        </div>
        <div class="col-md-3">
          <input type="text" class="form-control" placeholder="Unit" name="ingredient-unit" />
        </div>
        <div class="col-md-2">
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeIngredient(this)">×</button>
        </div>
      </div>
      <div class="row mt-1">
        <div class="col-md-10">
          <input type="text" class="form-control form-control-sm" placeholder="Notes (optional)" name="ingredient-notes" />
        </div>
      </div>
    </div>
  `;

  document.getElementById("steps-container").innerHTML = `
    <div class="step-row mb-2">
      <div class="row">
        <div class="col-md-10">
          <textarea class="form-control" placeholder="Step instruction" name="step-instruction" rows="2"></textarea>
        </div>
        <div class="col-md-2">
          <input type="number" class="form-control mb-1" placeholder="Time (min)" name="step-timing" />
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeStep(this)">×</button>
        </div>
      </div>
    </div>
  `;

  new bootstrap.Modal(document.getElementById("recipeModal")).show();
}

function addIngredient() {
  const container = document.getElementById("ingredients-container");
  const newIngredient = document.createElement("div");
  newIngredient.className = "ingredient-row mb-2";
  newIngredient.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <input type="text" class="form-control" placeholder="Ingredient name" name="ingredient-name" />
      </div>
      <div class="col-md-3">
        <input type="number" step="0.01" class="form-control" placeholder="Quantity" name="ingredient-quantity" />
      </div>
      <div class="col-md-3">
        <input type="text" class="form-control" placeholder="Unit" name="ingredient-unit" />
      </div>
      <div class="col-md-2">
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeIngredient(this)">×</button>
      </div>
    </div>
    <div class="row mt-1">
      <div class="col-md-10">
        <input type="text" class="form-control form-control-sm" placeholder="Notes (optional)" name="ingredient-notes" />
      </div>
    </div>
  `;
  container.appendChild(newIngredient);
}

function removeIngredient(button) {
  const container = document.getElementById("ingredients-container");
  if (container.children.length > 1) {
    button.closest(".ingredient-row").remove();
  }
}

function addStep() {
  const container = document.getElementById("steps-container");
  const newStep = document.createElement("div");
  newStep.className = "step-row mb-2";
  newStep.innerHTML = `
    <div class="row">
      <div class="col-md-10">
        <textarea class="form-control" placeholder="Step instruction" name="step-instruction" rows="2"></textarea>
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control mb-1" placeholder="Time (min)" name="step-timing" />
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeStep(this)">×</button>
      </div>
    </div>
  `;
  container.appendChild(newStep);
}

function removeStep(button) {
  const container = document.getElementById("steps-container");
  if (container.children.length > 1) {
    button.closest(".step-row").remove();
  }
}

async function saveRecipe() {
  // Collect form data
  const recipeData = {
    name: document.getElementById("recipeName").value,
    description: document.getElementById("recipeDescription").value,
    category: document.getElementById("recipeCategory").value,
    prep_time:
      parseInt(document.getElementById("recipePrepTime").value) || null,
    cook_time:
      parseInt(document.getElementById("recipeCookTime").value) || null,
    servings: parseInt(document.getElementById("recipeServings").value) || null,
    difficulty: document.getElementById("recipeDifficulty").value || null,
    ingredients: [],
    steps: [],
  };

  // Collect ingredients
  const ingredientRows = document.querySelectorAll(".ingredient-row");
  ingredientRows.forEach((row, index) => {
    const name = row.querySelector('input[name="ingredient-name"]').value;
    const quantity = row.querySelector(
      'input[name="ingredient-quantity"]'
    ).value;
    const unit = row.querySelector('input[name="ingredient-unit"]').value;
    const notes = row.querySelector('input[name="ingredient-notes"]').value;

    if (name.trim()) {
      recipeData.ingredients.push({
        name: name.trim(),
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit.trim() || null,
        notes: notes.trim() || null,
        order_index: index + 1,
      });
    }
  });

  // Collect steps
  const stepRows = document.querySelectorAll(".step-row");
  stepRows.forEach((row, index) => {
    const instruction = row.querySelector(
      'textarea[name="step-instruction"]'
    ).value;
    const timing = row.querySelector('input[name="step-timing"]').value;

    if (instruction.trim()) {
      recipeData.steps.push({
        step_number: index + 1,
        instruction: instruction.trim(),
        timing: timing ? parseInt(timing) : null,
      });
    }
  });

  // Validate required fields
  if (!recipeData.name || !recipeData.category) {
    alert("Please fill in the recipe name and category.");
    return;
  }

  if (recipeData.ingredients.length === 0) {
    alert("Please add at least one ingredient.");
    return;
  }

  try {
    const response = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipeData),
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(
        document.getElementById("recipeModal")
      ).hide();
      loadRecipes(); // Refresh the recipes list
      alert("Recipe saved successfully!");
    } else {
      const error = await response.json();
      alert("Error saving recipe: " + (error.error || "Unknown error"));
    }
  } catch (error) {
    console.error("Error saving recipe:", error);
    alert("Error saving recipe. Please try again.");
  }
}

// Database Management Functions
function logOperation(message, type = "info") {
  const logContainer = document.getElementById("operation-log");
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function checkDatabaseStatus() {
  try {
    logOperation("Checking database status...", "info");
    const response = await fetch("/api/database/status");
    const data = await response.json();

    if (data.success) {
      displayDatabaseStatus(data);
      logOperation("Database status check completed successfully", "success");
    } else {
      logOperation("Database status check failed: " + data.error, "error");
    }
  } catch (error) {
    console.error("Error checking database status:", error);
    logOperation("Error checking database status: " + error.message, "error");
  }
}

function displayDatabaseStatus(data) {
  const statusContainer = document.getElementById("database-status");

  let html = `
    <div class="alert alert-success">
      <strong>✅ Database Status:</strong> ${data.database_status}
      <br><small>Last checked: ${new Date(
        data.timestamp
      ).toLocaleString()}</small>
    </div>
  `;

  data.checks.forEach((check) => {
    html += `<div class="mb-3">`;
    html += `<h6>${check.check}</h6>`;

    if (check.check === "Data counts") {
      html += '<div class="row">';
      Object.entries(check.details).forEach(([table, count]) => {
        html += `
          <div class="col-md-4 mb-2">
            <div class="card card-body p-2">
              <strong>${table}:</strong> ${count}
            </div>
          </div>
        `;
      });
      html += "</div>";
    } else if (check.check === "Tables exist") {
      html += `<div class="badge-container">`;
      check.details.forEach((table) => {
        html += `<span class="badge bg-primary me-1">${table}</span>`;
      });
      html += `</div>`;
    } else if (check.check === "Foreign key constraints") {
      html += `<small class="text-muted">${check.details.length} foreign key constraints active</small>`;
    }

    html += `</div>`;
  });

  statusContainer.innerHTML = html;
}

async function resetDatabase() {
  if (
    !confirm(
      "⚠️ WARNING: This will completely reset your database and delete ALL existing data!\n\nAre you sure you want to continue?"
    )
  ) {
    return;
  }

  if (
    !confirm(
      "This action cannot be undone. Please confirm you want to reset the database."
    )
  ) {
    return;
  }

  try {
    logOperation("Starting database reset...", "warning");
    const response = await fetch("/api/database/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (data.success) {
      logOperation("✅ Database reset completed successfully!", "success");
      logOperation(
        "Database has been recreated with fresh sample data",
        "info"
      );

      // Refresh all data
      loadTables();
      loadMenuItems();
      loadOrders();
      loadRecipes();
      checkDatabaseStatus();

      alert(
        "Database reset completed successfully! All sections have been refreshed with sample data."
      );
    } else {
      logOperation("❌ Database reset failed: " + data.error, "error");
      alert("Database reset failed: " + data.error);
    }
  } catch (error) {
    console.error("Error resetting database:", error);
    logOperation("❌ Error resetting database: " + error.message, "error");
    alert("Error resetting database: " + error.message);
  }
}

async function seedDatabase() {
  if (
    !confirm(
      "This will clear existing data and add sample recipes, menu items, and tables.\n\nContinue?"
    )
  ) {
    return;
  }

  try {
    logOperation("Seeding database with sample data...", "info");
    const response = await fetch("/api/database/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (data.success) {
      logOperation("✅ Database seeded successfully!", "success");

      // Refresh all data
      loadTables();
      loadMenuItems();
      loadOrders();
      loadRecipes();
      checkDatabaseStatus();

      alert("Database seeded successfully! All sections have been refreshed.");
    } else {
      logOperation("❌ Database seeding failed: " + data.error, "error");
      alert("Database seeding failed: " + data.error);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
    logOperation("❌ Error seeding database: " + error.message, "error");
    alert("Error seeding database: " + error.message);
  }
}

async function backupDatabase() {
  try {
    logOperation("Creating database backup...", "info");

    const response = await fetch("/api/database/backup");

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `restaurant_backup_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      logOperation("✅ Database backup downloaded successfully!", "success");
    } else {
      const error = await response.json();
      logOperation("❌ Database backup failed: " + error.error, "error");
      alert("Database backup failed: " + error.error);
    }
  } catch (error) {
    console.error("Error backing up database:", error);
    logOperation("❌ Error backing up database: " + error.message, "error");
    alert("Error backing up database: " + error.message);
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

// Inventory Management Functionality

let currentProductPage = 1;
let productsPerPage = 25;
let filteredProducts = [];

async function loadInventoryData() {
  try {
    await Promise.all([
      loadProducts(),
      loadInventoryAlerts(),
      loadInventoryTransactions(),
      loadRecipeLinks()
    ]);
    updateInventoryDashboard();
    updateProductStatistics();
  } catch (error) {
    console.error("Error loading inventory data:", error);
  }
}

async function loadProducts() {
  try {
    const response = await fetch("/api/inventory/products");
    if (response.ok) {
      const data = await response.json();
      // Handle both array format and object format with products property
      if (Array.isArray(data)) {
        products = data;
      } else if (data.products && Array.isArray(data.products)) {
        products = data.products;
      } else {
        products = [];
      }
      filteredProducts = [...products]; // Initialize filteredProducts with all products
    } else {
      products = [];
      filteredProducts = [];
    }
    renderProductsList();
  } catch (error) {
    console.error("Error loading products:", error);
    products = [];
    filteredProducts = [];
    renderProductsList();
  }
}

async function loadInventoryAlerts() {
  try {
    const [lowStockResponse, outOfStockResponse] = await Promise.all([
      fetch("/api/inventory/alerts/low-stock"),
      fetch("/api/inventory/alerts/out-of-stock")
    ]);
    
    if (lowStockResponse.ok) {
      const lowStockData = await lowStockResponse.json();
      inventoryAlerts.lowStock = Array.isArray(lowStockData) ? lowStockData : [];
    } else {
      inventoryAlerts.lowStock = [];
    }
    
    if (outOfStockResponse.ok) {
      const outOfStockData = await outOfStockResponse.json();
      inventoryAlerts.outOfStock = Array.isArray(outOfStockData) ? outOfStockData : [];
    } else {
      inventoryAlerts.outOfStock = [];
    }
    
    renderInventoryAlerts();
    updateOutOfStockBanner();
  } catch (error) {
    console.error("Error loading inventory alerts:", error);
    inventoryAlerts.lowStock = [];
    inventoryAlerts.outOfStock = [];
    renderInventoryAlerts();
    updateOutOfStockBanner();
  }
}

async function loadInventoryTransactions() {
  try {
    const response = await fetch("/api/inventory/transactions");
    if (response.ok) {
      const data = await response.json();
      inventoryTransactions = Array.isArray(data) ? data : [];
    } else {
      inventoryTransactions = [];
    }
    renderTransactionsList();
  } catch (error) {
    console.error("Error loading inventory transactions:", error);
    inventoryTransactions = [];
    renderTransactionsList();
  }
}

async function loadRecipeLinks() {
  try {
    const response = await fetch("/api/inventory/recipe-links");
    if (response.ok) {
      const data = await response.json();
      recipeLinks = Array.isArray(data) ? data : [];
    } else {
      recipeLinks = [];
    }
    populateRecipeDropdowns();
  } catch (error) {
    console.error("Error loading recipe links:", error);
    recipeLinks = [];
    populateRecipeDropdowns();
  }
}

function updateInventoryDashboard() {
  // Update summary cards
  const totalProducts = products.length;
  const lowStockCount = inventoryAlerts.lowStock ? inventoryAlerts.lowStock.length : 0;
  const outOfStockCount = inventoryAlerts.outOfStock ? inventoryAlerts.outOfStock.length : 0;
  const totalValue = products.reduce((sum, product) => {
    return sum + (product.current_quantity * (product.cost_per_unit || 0));
  }, 0);

  document.getElementById("total-products").textContent = totalProducts;
  document.getElementById("low-stock-count").textContent = lowStockCount;
  document.getElementById("out-of-stock-count").textContent = outOfStockCount;
  document.getElementById("total-value").textContent = `$${totalValue.toFixed(2)}`;
}

function updateOutOfStockBanner() {
  const banner = document.getElementById("out-of-stock-banner");
  const itemsContainer = document.getElementById("out-of-stock-items");
  
  if (inventoryAlerts.outOfStock && inventoryAlerts.outOfStock.length > 0) {
    const itemsList = inventoryAlerts.outOfStock.map(item => item.name).join(", ");
    itemsContainer.textContent = `The following items are out of stock: ${itemsList}`;
    banner.classList.remove("d-none");
  } else {
    banner.classList.add("d-none");
  }
}

function renderProductsList() {
  const container = document.getElementById("products-list");
  
  // Ensure filteredProducts is an array
  if (!Array.isArray(filteredProducts)) filteredProducts = [];
  
  if (filteredProducts.length === 0) {
    if (container) {
      container.innerHTML = '<p class="text-muted text-center">No products found. <a href="#" onclick="showAddProductModal()">Add your first product</a></p>';
    }
    updateProductStatistics();
    return;
  }

  // Calculate pagination
  const startIndex = (currentProductPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const tableHtml = `
    <table class="table table-hover">
      <thead class="table-light">
        <tr>
          <th>
            <input type="checkbox" id="select-all-products" onchange="toggleAllProducts(this.checked)">
          </th>
          <th>Product Name</th>
          <th>Current Quantity</th>
          <th>Unit</th>
          <th>Status</th>
          <th>Cost per Unit</th>
          <th>Total Value</th>
          <th>Last Updated</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${paginatedProducts.map(product => {
          const status = getProductStatus(product);
          const totalValue = (product.current_quantity * (product.cost_per_unit || 0)).toFixed(2);
          const lastUpdated = product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-';
          
          return `
            <tr>
              <td>
                <input type="checkbox" class="product-checkbox" value="${product.id}">
              </td>
              <td>
                <div class="d-flex align-items-center">
                  <div>
                    <strong>${product.name}</strong>
                    ${product.description ? `<br><small class="text-muted">${product.description}</small>` : ''}
                    ${product.supplier_info ? `<br><small class="text-info"><i class="fas fa-truck"></i> ${product.supplier_info.substring(0, 30)}${product.supplier_info.length > 30 ? '...' : ''}</small>` : ''}
                  </div>
                </div>
              </td>
              <td>
                <span class="fw-bold">${product.current_quantity}</span>
                ${product.low_stock_threshold ? `<br><small class="text-muted">Threshold: ${product.low_stock_threshold}</small>` : ''}
              </td>
              <td>${product.unit_of_measure}</td>
              <td>
                <span class="badge product-quantity-badge ${status.class}">
                  ${status.text}
                </span>
              </td>
              <td>${product.cost_per_unit ? `$${parseFloat(product.cost_per_unit).toFixed(2)}` : '-'}</td>
              <td class="fw-bold text-success">$${totalValue}</td>
              <td>${lastUpdated}</td>
              <td>
                <div class="btn-group" role="group">
                  <button class="btn btn-sm btn-outline-primary inventory-action-btn" onclick="showAdjustmentModal(${product.id})" title="Adjust Quantity">
                    <i class="fas fa-edit"></i> Adjust
                  </button>
                  <button class="btn btn-sm btn-outline-success inventory-action-btn" onclick="quickRestock(${product.id})" title="Quick Restock">
                    <i class="fas fa-plus"></i> Restock
                  </button>
                  <button class="btn btn-sm btn-outline-info inventory-action-btn" onclick="editProduct(${product.id})" title="Edit Product">
                    <i class="fas fa-cog"></i> Edit
                  </button>
                  <button class="btn btn-sm btn-outline-danger inventory-action-btn" onclick="deleteProduct(${product.id})" title="Delete Product">
                    <i class="fas fa-trash"></i> Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHtml;
  renderProductsPagination();
  updateProductStatistics();
}

function getProductStatus(product) {
  if (product.current_quantity <= 0) {
    return { class: 'out-of-stock', text: 'Out of Stock' };
  } else if (product.current_quantity <= product.low_stock_threshold) {
    return { class: 'low-stock', text: 'Low Stock' };
  } else {
    return { class: 'in-stock', text: 'In Stock' };
  }
}

function renderInventoryAlerts() {
  // Render low stock alerts
  const lowStockContainer = document.getElementById("low-stock-alerts");
  if (inventoryAlerts.lowStock && inventoryAlerts.lowStock.length > 0) {
    lowStockContainer.innerHTML = inventoryAlerts.lowStock.map(item => `
      <div class="inventory-alert-item low-stock">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.name}</strong>
            <br><small>Current: ${item.current_quantity} ${item.unit_of_measure} | Threshold: ${item.low_stock_threshold}</small>
          </div>
          <button class="btn btn-sm btn-warning" onclick="showAdjustmentModal(${item.id})">
            Restock
          </button>
        </div>
      </div>
    `).join('');
  } else {
    lowStockContainer.innerHTML = '<p class="text-muted">No low stock alerts</p>';
  }

  // Render out of stock alerts
  const outOfStockContainer = document.getElementById("out-of-stock-alerts");
  if (inventoryAlerts.outOfStock && inventoryAlerts.outOfStock.length > 0) {
    outOfStockContainer.innerHTML = inventoryAlerts.outOfStock.map(item => `
      <div class="inventory-alert-item out-of-stock">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${item.name}</strong>
            <br><small class="text-danger">Out of stock!</small>
          </div>
          <button class="btn btn-sm btn-danger" onclick="showAdjustmentModal(${item.id})">
            Restock Now
          </button>
        </div>
      </div>
    `).join('');
  } else {
    outOfStockContainer.innerHTML = '<p class="text-muted">No out of stock items</p>';
  }
}

function renderTransactionsList() {
  const container = document.getElementById("transactions-list");
  
  if (inventoryTransactions.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No transactions found.</p>';
    return;
  }

  const tableHtml = `
    <table class="table table-hover">
      <thead>
        <tr>
          <th>Date</th>
          <th>Product</th>
          <th>Type</th>
          <th>Quantity Change</th>
          <th>Reference</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${inventoryTransactions.map(transaction => `
          <tr>
            <td>${new Date(transaction.created_at).toLocaleString()}</td>
            <td>${transaction.product_name || 'Unknown Product'}</td>
            <td>
              <span class="badge transaction-type-badge transaction-type-${transaction.transaction_type}">
                ${transaction.transaction_type.toUpperCase()}
              </span>
            </td>
            <td class="${transaction.quantity_change >= 0 ? 'text-success' : 'text-danger'}">
              ${transaction.quantity_change >= 0 ? '+' : ''}${transaction.quantity_change}
            </td>
            <td>${transaction.reference_type || '-'} ${transaction.reference_id || ''}</td>
            <td>${transaction.notes || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHtml;
}

// Product Management Functions
function showAddProductModal() {
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productModalTitle").textContent = "Add Product";
  new bootstrap.Modal(document.getElementById("productModal")).show();
}

function editProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productDescription").value = product.description || "";
  document.getElementById("productUnit").value = product.unit_of_measure;
  document.getElementById("productQuantity").value = product.current_quantity;
  document.getElementById("productThreshold").value = product.low_stock_threshold;
  document.getElementById("productCost").value = product.cost_per_unit || "";
  document.getElementById("productSupplier").value = product.supplier_info || "";
  
  document.getElementById("productModalTitle").textContent = "Edit Product";
  new bootstrap.Modal(document.getElementById("productModal")).show();
}

async function saveProduct() {
  const productId = document.getElementById("productId").value;
  const formData = {
    name: document.getElementById("productName").value,
    description: document.getElementById("productDescription").value,
    unit_of_measure: document.getElementById("productUnit").value,
    current_quantity: parseFloat(document.getElementById("productQuantity").value),
    low_stock_threshold: parseInt(document.getElementById("productThreshold").value),
    cost_per_unit: parseFloat(document.getElementById("productCost").value) || null,
    supplier_info: document.getElementById("productSupplier").value
  };

  try {
    const url = productId ? `/api/inventory/products/${productId}` : "/api/inventory/products";
    const method = productId ? "PUT" : "POST";
    
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById("productModal")).hide();
      loadInventoryData();
    } else {
      const error = await response.json();
      alert("Error saving product: " + error.error);
    }
  } catch (error) {
    console.error("Error saving product:", error);
    alert("Error saving product. Please try again.");
  }
}

async function deleteProduct(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/inventory/products/${productId}`, {
      method: "DELETE"
    });

    if (response.ok) {
      loadInventoryData();
    } else {
      const error = await response.json();
      alert("Error deleting product: " + error.error);
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    alert("Error deleting product. Please try again.");
  }
}

// Inventory Adjustment Functions
function showAdjustmentModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  document.getElementById("adjustmentForm").reset();
  document.getElementById("adjustmentProductId").value = product.id;
  document.getElementById("adjustmentProductName").value = product.name;
  document.getElementById("adjustmentCurrentQuantity").value = `${product.current_quantity} ${product.unit_of_measure}`;
  
  new bootstrap.Modal(document.getElementById("adjustmentModal")).show();
}

async function quickRestock(productId) {
  const quantity = prompt("Enter quantity to add:");
  if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) return;

  try {
    const response = await fetch(`/api/inventory/products/${productId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parseFloat(quantity),
        notes: "Quick restock from dashboard"
      })
    });

    if (response.ok) {
      loadInventoryData();
    } else {
      const error = await response.json();
      alert("Error restocking product: " + error.error);
    }
  } catch (error) {
    console.error("Error restocking product:", error);
    alert("Error restocking product. Please try again.");
  }
}

async function saveAdjustment() {
  const productId = document.getElementById("adjustmentProductId").value;
  const type = document.getElementById("adjustmentType").value;
  const quantity = parseFloat(document.getElementById("adjustmentQuantity").value);
  const notes = document.getElementById("adjustmentNotes").value;

  if (!quantity || isNaN(quantity)) {
    alert("Please enter a valid quantity.");
    return;
  }

  try {
    const endpoint = type === "restock" ? "restock" : "adjust";
    const response = await fetch(`/api/inventory/products/${productId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: quantity,
        transaction_type: type,
        notes: notes
      })
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById("adjustmentModal")).hide();
      loadInventoryData();
    } else {
      const error = await response.json();
      alert("Error adjusting inventory: " + error.error);
    }
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    alert("Error adjusting inventory. Please try again.");
  }
}

// Recipe Linking Functions
function populateRecipeDropdowns() {
  // Populate recipe select in main tab
  const recipeSelect = document.getElementById("recipe-select");
  recipeSelect.innerHTML = '<option value="">Select a recipe to view links...</option>';
  
  // Populate recipe select in modal
  const modalRecipeSelect = document.getElementById("linkRecipeId");
  modalRecipeSelect.innerHTML = '<option value="">Select recipe...</option>';
  
  // Populate product select in modal
  const productSelect = document.getElementById("linkProductId");
  productSelect.innerHTML = '<option value="">Select product...</option>';
  
  recipes.forEach(recipe => {
    const option1 = document.createElement("option");
    option1.value = recipe.id;
    option1.textContent = recipe.name;
    recipeSelect.appendChild(option1);
    
    const option2 = document.createElement("option");
    option2.value = recipe.id;
    option2.textContent = recipe.name;
    modalRecipeSelect.appendChild(option2);
  });
  
  products.forEach(product => {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} (${product.unit_of_measure})`;
    productSelect.appendChild(option);
  });
}

function showRecipeLinkModal() {
  document.getElementById("recipeLinkForm").reset();
  populateRecipeDropdowns();
  new bootstrap.Modal(document.getElementById("recipeLinkModal")).show();
}

async function loadRecipeIngredients() {
  const recipeId = document.getElementById("linkRecipeId").value;
  const ingredientSelect = document.getElementById("linkIngredientId");
  
  ingredientSelect.innerHTML = '<option value="">Select ingredient...</option>';
  
  if (!recipeId) return;

  try {
    const response = await fetch(`/api/recipes/${recipeId}`);
    const data = await response.json();
    const recipe = data.recipe;
    
    if (recipe.ingredients) {
      recipe.ingredients.forEach(ingredient => {
        const option = document.createElement("option");
        option.value = ingredient.id;
        option.textContent = `${ingredient.name} (${ingredient.quantity || ''} ${ingredient.unit || ''})`;
        ingredientSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading recipe ingredients:", error);
  }
}

async function saveRecipeLink() {
  const formData = {
    recipe_ingredient_id: parseInt(document.getElementById("linkIngredientId").value),
    product_id: parseInt(document.getElementById("linkProductId").value),
    quantity_per_serving: parseFloat(document.getElementById("linkQuantityPerServing").value)
  };

  try {
    const response = await fetch("/api/inventory/recipe-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      bootstrap.Modal.getInstance(document.getElementById("recipeLinkModal")).hide();
      loadRecipeLinks();
    } else {
      const error = await response.json();
      alert("Error saving recipe link: " + error.error);
    }
  } catch (error) {
    console.error("Error saving recipe link:", error);
    alert("Error saving recipe link. Please try again.");
  }
}

// Search and Filter Functions
document.addEventListener("DOMContentLoaded", function() {
  // Product search functionality
  const productSearch = document.getElementById("product-search");
  if (productSearch) {
    productSearch.addEventListener("input", filterProducts);
  }
  
  const productFilter = document.getElementById("product-filter");
  if (productFilter) {
    productFilter.addEventListener("change", filterProducts);
  }
});

function filterProducts() {
  const searchTerm = document.getElementById("product-search").value.toLowerCase();
  const filterType = document.getElementById("product-filter").value;
  
  let filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm));
    
    let matchesFilter = true;
    if (filterType === "low-stock") {
      matchesFilter = product.current_quantity <= product.low_stock_threshold && product.current_quantity > 0;
    } else if (filterType === "out-of-stock") {
      matchesFilter = product.current_quantity <= 0;
    } else if (filterType === "in-stock") {
      matchesFilter = product.current_quantity > product.low_stock_threshold;
    }
    
    return matchesSearch && matchesFilter;
  });
  
  // Temporarily replace products array for rendering
  const originalProducts = products;
  products = filteredProducts;
  renderProductsList();
  products = originalProducts;
}

// Utility Functions
function showBulkRestockModal() {
  alert("Bulk restock functionality coming soon!");
}

function showInventoryReports() {
  alert("Inventory reports functionality coming soon!");
}

function showRecipeLinking() {
  // Switch to recipe links tab
  const recipeLinkTab = document.getElementById("recipe-links-tab");
  recipeLinkTab.click();
}

// Enhanced Inventory Management Functions

function updateProductStatistics() {
  // Ensure arrays are initialized
  if (!Array.isArray(filteredProducts)) filteredProducts = [];
  if (!Array.isArray(products)) products = [];
  
  const showing = Math.min(filteredProducts.length, productsPerPage);
  const total = products.length;
  const totalValue = filteredProducts.reduce((sum, product) => {
    return sum + (product.current_quantity * (product.cost_per_unit || 0));
  }, 0);
  const avgCost = filteredProducts.length > 0 ? 
    filteredProducts.reduce((sum, product) => sum + (product.cost_per_unit || 0), 0) / filteredProducts.length : 0;

  const showingElement = document.getElementById("products-showing");
  const totalElement = document.getElementById("products-total");
  const valueElement = document.getElementById("products-value");
  const avgCostElement = document.getElementById("products-avg-cost");
  
  if (showingElement) showingElement.textContent = showing;
  if (totalElement) totalElement.textContent = total;
  if (valueElement) valueElement.textContent = `$${totalValue.toFixed(2)}`;
  if (avgCostElement) avgCostElement.textContent = `$${avgCost.toFixed(2)}`;
}

function renderProductsPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const pagination = document.getElementById("products-pagination");
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let paginationHtml = '';
  
  // Previous button
  paginationHtml += `
    <li class="page-item ${currentProductPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changeProductPage(${currentProductPage - 1})">Previous</a>
    </li>
  `;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentProductPage - 2 && i <= currentProductPage + 2)) {
      paginationHtml += `
        <li class="page-item ${i === currentProductPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changeProductPage(${i})">${i}</a>
        </li>
      `;
    } else if (i === currentProductPage - 3 || i === currentProductPage + 3) {
      paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }
  
  // Next button
  paginationHtml += `
    <li class="page-item ${currentProductPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="changeProductPage(${currentProductPage + 1})">Next</a>
    </li>
  `;
  
  pagination.innerHTML = paginationHtml;
}

function changeProductPage(page) {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentProductPage = page;
    renderProductsList();
  }
}

function changeProductsPerPage() {
  productsPerPage = parseInt(document.getElementById("products-per-page").value);
  currentProductPage = 1;
  renderProductsList();
}

function toggleAllProducts(checked) {
  const checkboxes = document.querySelectorAll('.product-checkbox');
  checkboxes.forEach(checkbox => checkbox.checked = checked);
}

function getSelectedProducts() {
  const checkboxes = document.querySelectorAll('.product-checkbox:checked');
  return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// Enhanced filtering
function filterProducts() {
  // Ensure products is an array
  if (!Array.isArray(products)) products = [];
  
  const searchTerm = document.getElementById("product-search")?.value?.toLowerCase() || "";
  const filterType = document.getElementById("product-filter")?.value || "";
  const unitFilter = document.getElementById("unit-filter")?.value || "";
  
  filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm)) ||
                         (product.supplier_info && product.supplier_info.toLowerCase().includes(searchTerm));
    
    let matchesFilter = true;
    if (filterType === "low-stock") {
      matchesFilter = product.current_quantity <= product.low_stock_threshold && product.current_quantity > 0;
    } else if (filterType === "out-of-stock") {
      matchesFilter = product.current_quantity <= 0;
    } else if (filterType === "in-stock") {
      matchesFilter = product.current_quantity > product.low_stock_threshold;
    }
    
    let matchesUnit = true;
    if (unitFilter) {
      matchesUnit = product.unit_of_measure === unitFilter;
    }
    
    return matchesSearch && matchesFilter && matchesUnit;
  });
  
  currentProductPage = 1;
  renderProductsList();
}

// Recipe linking enhancements
async function loadRecipeLinks() {
  const recipeId = document.getElementById("recipe-select").value;
  if (!recipeId) {
    document.getElementById("recipe-links-list").innerHTML = '<p class="text-muted">Select a recipe to view its ingredient links.</p>';
    document.getElementById("recipe-info-card").style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`/api/inventory/recipe-links/${recipeId}`);
    const links = await response.json();
    
    // Load recipe details
    const recipeResponse = await fetch(`/api/recipes/${recipeId}`);
    const recipeData = await recipeResponse.json();
    const recipe = recipeData.recipe;
    
    renderRecipeInfo(recipe);
    renderRecipeLinks(links, recipe);
    calculateRecipeCost(links, recipe);
  } catch (error) {
    console.error("Error loading recipe links:", error);
  }
}

function renderRecipeInfo(recipe) {
  const card = document.getElementById("recipe-info-card");
  const title = document.getElementById("recipe-info-title");
  const details = document.getElementById("recipe-info-details");
  
  title.textContent = recipe.name;
  details.innerHTML = `
    <p class="mb-2">${recipe.description || 'No description available'}</p>
    <div class="row">
      <div class="col-md-3">
        <small class="text-muted">Prep Time</small>
        <div>${recipe.prep_time || 0} min</div>
      </div>
      <div class="col-md-3">
        <small class="text-muted">Cook Time</small>
        <div>${recipe.cook_time || 0} min</div>
      </div>
      <div class="col-md-3">
        <small class="text-muted">Servings</small>
        <div>${recipe.servings || 1}</div>
      </div>
      <div class="col-md-3">
        <small class="text-muted">Difficulty</small>
        <div>${recipe.difficulty || 'Not specified'}</div>
      </div>
    </div>
  `;
  
  card.style.display = 'block';
}

function renderRecipeLinks(links, recipe) {
  const container = document.getElementById("recipe-links-list");
  
  if (links.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <h6>No ingredient links found</h6>
        <p class="mb-0">This recipe doesn't have any ingredients linked to inventory products yet. 
        <a href="#" onclick="showRecipeLinkModal()">Add the first link</a></p>
      </div>
    `;
    return;
  }

  const tableHtml = `
    <table class="table table-hover">
      <thead class="table-light">
        <tr>
          <th>Recipe Ingredient</th>
          <th>Linked Product</th>
          <th>Quantity per Serving</th>
          <th>Available Stock</th>
          <th>Cost per Serving</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${links.map(link => {
          const costPerServing = (link.quantity_per_serving * (link.product_cost_per_unit || 0)).toFixed(3);
          const stockStatus = getProductStatus({ current_quantity: link.product_current_quantity, low_stock_threshold: link.product_low_stock_threshold });
          
          return `
            <tr>
              <td>
                <strong>${link.ingredient_name}</strong>
                ${link.ingredient_notes ? `<br><small class="text-muted">${link.ingredient_notes}</small>` : ''}
              </td>
              <td>
                <strong>${link.product_name}</strong>
                <br><small class="text-muted">${link.product_unit_of_measure}</small>
              </td>
              <td>${link.quantity_per_serving} ${link.product_unit_of_measure}</td>
              <td>
                <span class="badge product-quantity-badge ${stockStatus.class}">
                  ${link.product_current_quantity} ${link.product_unit_of_measure}
                </span>
              </td>
              <td class="text-success">$${costPerServing}</td>
              <td>
                <div class="btn-group" role="group">
                  <button class="btn btn-sm btn-outline-primary" onclick="editRecipeLink(${link.id})" title="Edit Link">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteRecipeLink(${link.id})" title="Delete Link">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHtml;
}

function calculateRecipeCost(links, recipe) {
  const totalCost = links.reduce((sum, link) => {
    return sum + (link.quantity_per_serving * (link.product_cost_per_unit || 0));
  }, 0);
  
  const costPerServing = totalCost;
  const totalRecipeCost = totalCost * (recipe.servings || 1);
  
  document.getElementById("recipe-cost-per-serving").textContent = `$${costPerServing.toFixed(2)}`;
  document.getElementById("recipe-total-cost").textContent = `$${totalRecipeCost.toFixed(2)}`;
}

// Bulk operations
function showBulkRestockModal() {
  populateBulkRestockProducts();
  new bootstrap.Modal(document.getElementById("bulkOperationsModal")).show();
}

function populateBulkRestockProducts() {
  const container = document.getElementById("bulk-restock-products");
  
  const productsHtml = products.map(product => {
    const status = getProductStatus(product);
    return `
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" value="${product.id}" id="bulk-product-${product.id}">
        <label class="form-check-label d-flex justify-content-between align-items-center" for="bulk-product-${product.id}">
          <div>
            <strong>${product.name}</strong>
            <br><small class="text-muted">${product.current_quantity} ${product.unit_of_measure}</small>
          </div>
          <span class="badge product-quantity-badge ${status.class}">${status.text}</span>
        </label>
      </div>
    `;
  }).join('');
  
  container.innerHTML = productsHtml;
}

async function executeBulkOperation() {
  const activeTab = document.querySelector('#bulkTabs .nav-link.active').id;
  
  if (activeTab === 'bulk-restock-tab') {
    await executeBulkRestock();
  } else if (activeTab === 'bulk-adjust-tab') {
    await executeBulkAdjust();
  } else if (activeTab === 'bulk-import-tab') {
    await executeBulkImport();
  }
}

async function executeBulkRestock() {
  const selectedProducts = Array.from(document.querySelectorAll('#bulk-restock-products input:checked')).map(cb => cb.value);
  const quantity = parseFloat(document.getElementById("bulkRestockQuantity").value);
  const reference = document.getElementById("bulkRestockReference").value;
  const notes = document.getElementById("bulkRestockNotes").value;
  
  if (selectedProducts.length === 0 || !quantity || quantity <= 0) {
    alert("Please select products and enter a valid quantity.");
    return;
  }
  
  try {
    const promises = selectedProducts.map(productId => 
      fetch(`/api/inventory/products/${productId}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: quantity,
          notes: `${notes} (Bulk restock${reference ? ` - ${reference}` : ''})`
        })
      })
    );
    
    await Promise.all(promises);
    bootstrap.Modal.getInstance(document.getElementById("bulkOperationsModal")).hide();
    loadInventoryData();
    alert(`Successfully restocked ${selectedProducts.length} products.`);
  } catch (error) {
    console.error("Error executing bulk restock:", error);
    alert("Error executing bulk restock. Please try again.");
  }
}

// Export functionality
function exportProductsCSV() {
  const csvContent = generateProductsCSV();
  downloadCSV(csvContent, 'inventory-products.csv');
}

function generateProductsCSV() {
  const headers = ['Name', 'Description', 'Unit of Measure', 'Current Quantity', 'Low Stock Threshold', 'Cost per Unit', 'Total Value', 'Supplier Info'];
  const rows = filteredProducts.map(product => [
    product.name,
    product.description || '',
    product.unit_of_measure,
    product.current_quantity,
    product.low_stock_threshold,
    product.cost_per_unit || '',
    (product.current_quantity * (product.cost_per_unit || 0)).toFixed(2),
    product.supplier_info || ''
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function downloadCSVTemplate() {
  const template = 'name,description,unit_of_measure,current_quantity,low_stock_threshold,cost_per_unit\n"Sample Product","Sample description","kg",100,10,5.99';
  downloadCSV(template, 'product-import-template.csv');
}

// Recipe cost analysis
function showRecipeCostAnalysis() {
  const recipeId = document.getElementById("recipe-select").value;
  if (!recipeId) {
    alert("Please select a recipe first.");
    return;
  }
  
  // This would load detailed cost analysis
  new bootstrap.Modal(document.getElementById("recipeCostModal")).show();
}

// Initialize enhanced filtering
document.addEventListener("DOMContentLoaded", function() {
  // Enhanced product search functionality
  const productSearch = document.getElementById("product-search");
  if (productSearch) {
    productSearch.addEventListener("input", filterProducts);
  }
  
  const productFilter = document.getElementById("product-filter");
  if (productFilter) {
    productFilter.addEventListener("change", filterProducts);
  }
  
  const unitFilter = document.getElementById("unit-filter");
  if (unitFilter) {
    unitFilter.addEventListener("change", filterProducts);
  }
  
  // Initialize filtered products
  if (!Array.isArray(products)) products = [];
  filteredProducts = [...products];
});

// Override the original loadProducts to initialize filtered products
const originalLoadProducts = loadProducts;
loadProducts = async function() {
  await originalLoadProducts();
  filteredProducts = [...products];
  renderProductsList();
};