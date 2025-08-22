// Restaurant Management System Frontend

let currentSection = "tables";
let tables = [];
let menuItems = [];
let orders = [];
let recipes = [];
let availableRecipes = [];

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
