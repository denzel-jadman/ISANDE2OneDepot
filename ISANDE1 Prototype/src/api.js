const STATE_KEY = "onedepot_demo_state";
const CURRENT_USER_KEY = "onedepot_demo_user_id";
const WAITLIST_KEY = "onedepot_waitlist";

const starterProducts = [
  ["M16-GB-001", "M16 Gearbox Assembly", "Airsoft Parts & Internals", 1500, 5],
  ["AK47-GB-001", "AK47 Gearbox Assembly", "Airsoft Parts & Internals", 1800, 8],
  ["HOP-UNIT-001", "Precision Hop-Up Unit", "Airsoft Parts & Internals", 800, 12],
  ["BARREL-6.03", "6.03mm Precision Barrel 455mm", "Airsoft Parts & Internals", 950, 15],
  ["MAG-HICAP-500", "Hi-Cap Magazine 500rds", "Airsoft Parts & Internals", 450, 20],
  ["SCOPE-4x32", "4x32 Tactical Scope", "Gun Attachments", 1200, 6],
  ["RIFLE-M4-001", "M4 CQB AEG Airsoft Rifle", "Airsoft Rifles", 12500, 4],
  ["RIFLE-AK-002", "AK-74 Tactical AEG Rifle", "Airsoft Rifles", 13900, 3],
  ["RIFLE-SR-003", "SR-25 DMR AEG Rifle", "Airsoft Rifles", 16800, 2],
  ["PISTOL-G17-001", "G17 Gas Blowback Pistol", "Airsoft Pistols", 6200, 7],
  ["PISTOL-HI-002", "Hi-Capa 5.1 Gas Pistol", "Airsoft Pistols", 7800, 5],
  ["PART-MOTOR-001", "High Torque AEG Motor", "Airsoft Parts & Internals", 1450, 9],
  ["PART-SPRING-002", "M110 Upgrade Spring", "Airsoft Parts & Internals", 380, 14],
  ["ATTACH-RD-001", "Micro Red Dot Sight", "Gun Attachments", 1850, 10],
  ["ATTACH-GRIP-002", "Angled Foregrip", "Gun Attachments", 650, 16],
  ["BATT-LIPO-001", "7.4V LiPo Battery", "Batteries & Chargers", 980, 12],
  ["CHARGE-BAL-002", "LiPo Balance Charger", "Batteries & Chargers", 1250, 8],
  ["GAS-GG-001", "Green Gas Canister", "Gas & Ammunition", 550, 18],
  ["AMMO-BB-002", "0.25g BB Pellets 1kg", "Gas & Ammunition", 620, 20],
  ["BAG-RIFLE-001", "42-inch Padded Rifle Bag", "Storage & Carry", 1750, 6],
  ["HOLSTER-002", "Universal Pistol Holster", "Storage & Carry", 780, 11],
  ["GEAR-MASK-001", "Full Face Mesh Mask", "Protective Gear", 690, 15],
  ["GEAR-HELMET-002", "Tactical Fast Helmet", "Protective Gear", 2100, 7],
  ["APPAREL-SHIRT-001", "Long Sleeve Tactical Shirt", "Clothing", 1350, 10],
  ["APPAREL-BOOTS-002", "Tactical Field Boots", "Clothing", 2950, 6],
  ["UTILITY-KNIFE-001", "Folding Utility Knife", "Knives & Utilities", 850, 9],
].map(([sku, name, category, price, quantity], index) => ({ id: index + 1, sku, name, category, price, quantity, lowStockAt: 3 }));

function initialState() {
  return {
    nextIds: { user: 3, product: 27, order: 1, ticket: 1, purchaseOrder: 1, restockNote: 1, notification: 1 },
    users: [
      { id: 1, name: "Gina", email: "owner@onedepot.com", phone: "09123456789", password: "OwnerPassword123", role: "OWNER" },
      { id: 2, name: "On-duty Gunsmith", email: "gunsmith@onedepot.com", phone: "", password: "GunsmithPassword123", role: "GUNSMITH" },
    ],
    products: starterProducts,
    orders: [],
    tickets: [],
    repairSettings: { complexLaborPrice: 1500, gcashInstructions: "Pay using the store GCash QR and upload a clear screenshot of the payment." },
    purchaseOrders: [],
    restockNotes: [],
    notifications: [],
  };
}

function state() {
  const saved = localStorage.getItem(STATE_KEY);
  if (!saved) {
    const fresh = initialState();
    localStorage.setItem(STATE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  const parsed = JSON.parse(saved);
  let changed = false;
  const owner = parsed.users?.find((user) => user.email === "owner@onedepot.com" && user.role === "OWNER");
  if (owner && owner.name !== "Gina") { owner.name = "Gina"; changed = true; }
  if (!parsed.nextIds) { parsed.nextIds = {}; changed = true; }
  if (!Array.isArray(parsed.purchaseOrders)) { parsed.purchaseOrders = []; changed = true; }
  if (!Array.isArray(parsed.restockNotes)) { parsed.restockNotes = []; changed = true; }
  if (!Array.isArray(parsed.notifications)) { parsed.notifications = []; changed = true; }
  if (!parsed.repairSettings) {
    parsed.repairSettings = { complexLaborPrice: 1500, gcashInstructions: "Pay using the store GCash QR and upload a clear screenshot of the payment." };
    changed = true;
  }
  const oldRepairStatuses = { RECEIVED: "AWAITING_GUNSMITH", SLOT_ASSIGNED: "AWAITING_GUNSMITH", IN_PROGRESS: "IN_REPAIR", READY_FOR_PICKUP: "PAID_READY_FOR_PICKUP" };
  parsed.tickets.forEach((ticket) => {
    if (oldRepairStatuses[ticket.status]) { ticket.status = oldRepairStatuses[ticket.status]; changed = true; }
    if (!Array.isArray(ticket.partsUsed)) { ticket.partsUsed = []; changed = true; }
    if (ticket.partsTotal == null) { ticket.partsTotal = 0; changed = true; }
    if (ticket.laborPrice == null) { ticket.laborPrice = 0; changed = true; }
    if (ticket.totalPrice == null) { ticket.totalPrice = 0; changed = true; }
  });
  if (!parsed.nextIds.purchaseOrder) {
    parsed.nextIds.purchaseOrder = Math.max(0, ...parsed.purchaseOrders.map((purchaseOrder) => Number(purchaseOrder.id))) + 1;
    changed = true;
  }
  if (!parsed.nextIds.restockNote) {
    parsed.nextIds.restockNote = Math.max(0, ...parsed.restockNotes.map((note) => Number(note.id))) + 1;
    changed = true;
  }
  if (!parsed.nextIds.notification) {
    parsed.nextIds.notification = Math.max(0, ...parsed.notifications.map((notification) => Number(notification.id))) + 1;
    changed = true;
  }
  const existingSkus = new Set(parsed.products.map((product) => product.sku));
  const missingProducts = starterProducts.filter((product) => !existingSkus.has(product.sku));
  if (missingProducts.length) {
    const nextProductId = Math.max(0, ...parsed.products.map((product) => product.id)) + 1;
    parsed.products.push(...missingProducts.map((product, index) => ({ ...product, id: nextProductId + index })));
    parsed.nextIds.product = nextProductId + missingProducts.length;
    changed = true;
  }
  if (changed) localStorage.setItem(STATE_KEY, JSON.stringify(parsed));
  return parsed;
}

function save(next) {
  localStorage.setItem(STATE_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("onedepot:data-updated"));
}
function response(data) { return Promise.resolve({ data }); }
function fail(error) { return Promise.reject({ response: { data: { error } } }); }
function now() { return new Date().toISOString(); }
function currentUser(data) { return data.users.find((user) => user.id === Number(localStorage.getItem(CURRENT_USER_KEY))); }
function token(user) { return `demo.${btoa(JSON.stringify({ id: user.id, name: user.name, role: user.role }))}.demo`; }
function withRelations(data, order) {
  return {
    ...order,
    customer: data.users.find((user) => user.id === order.customerId),
    items: order.items.map((item) => ({ ...item, product: data.products.find((product) => product.id === item.productId) })),
  };
}
function ticketWithRelations(data, ticket) {
  return { ...ticket, customer: data.users.find((user) => user.id === ticket.customerId), gunsmith: data.users.find((user) => user.id === ticket.gunsmithId) };
}
function purchaseOrderWithRelations(data, purchaseOrder) {
  return {
    ...purchaseOrder,
    items: purchaseOrder.items.map((item) => ({
      ...item,
      product: data.products.find((product) => product.id === item.productId) ?? (item.newProduct ? { ...item.newProduct, id: null, quantity: 0, pendingCatalogItem: true } : null),
    })),
  };
}
function restockNoteWithRelations(data, note) {
  return {
    ...note,
    product: data.products.find((product) => product.id === note.productId),
    purchaseOrder: data.purchaseOrders.find((purchaseOrder) => purchaseOrder.id === note.purchaseOrderId),
    author: data.users.find((user) => user.id === note.createdBy),
  };
}
function canManageInventory(user) { return user?.role === "OWNER" || user?.role === "STAFF"; }
function parseItems(value) { return typeof value === "string" ? JSON.parse(value) : value; }
function addNotification(data, userId, { type = "INFO", title, message, link = "/" }) {
  if (!userId) return;
  data.notifications.push({ id: data.nextIds.notification++, userId: Number(userId), type, title, message, link, isRead: false, createdAt: now() });
}
function notifyRoles(data, roles, notification) {
  data.users.filter((user) => roles.includes(user.role)).forEach((user) => addNotification(data, user.id, notification));
}
function notifyWaitlistRestock(data, product, previousQuantity) {
  if (Number(previousQuantity) > 0 || Number(product.quantity) <= 0) return;
  let waitlist = [];
  try { waitlist = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]"); } catch { waitlist = []; }
  const retained = [];
  waitlist.forEach((entry) => {
    if (Number(entry.productId) !== Number(product.id)) { retained.push(entry); return; }
    const userId = String(entry.owner ?? "").startsWith("user-") ? Number(String(entry.owner).slice(5)) : null;
    const customer = data.users.find((user) => user.id === userId && user.role === "CUSTOMER");
    if (customer) addNotification(data, customer.id, { type: "RESTOCK", title: "Back in stock", message: `${product.name} is available again with ${product.quantity} unit(s) in stock.`, link: "/" });
  });
  localStorage.setItem(WAITLIST_KEY, JSON.stringify(retained));
}

const api = {
  async get(url, config = {}) {
    const data = state();
    const user = currentUser(data);
    if (url === "/products") {
      const { search = "", category = "" } = config.params ?? {};
      const searchText = search.toLowerCase();
      const confirmedStatuses = new Set(["PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"]);
      const unitsSoldByProduct = new Map();
      data.orders
        .filter((order) => confirmedStatuses.has(order.status))
        .forEach((order) => order.items.forEach((item) => {
          unitsSoldByProduct.set(item.productId, (unitsSoldByProduct.get(item.productId) ?? 0) + Number(item.quantity));
        }));
      return response(data.products
        .filter((product) => (!category || product.category === category) && (!searchText || product.name.toLowerCase().includes(searchText) || product.sku.toLowerCase().includes(searchText)))
        .map((product) => ({ ...product, unitsSold: unitsSoldByProduct.get(product.id) ?? 0 })));
    }
    if (url === "/orders") return user?.role === "OWNER" || user?.role === "STAFF" ? response(data.orders.map((order) => withRelations(data, order))) : fail("Not authorized");
    if (url === "/orders/mine") return user ? response(data.orders.filter((order) => order.customerId === user.id).map((order) => withRelations(data, order))) : fail("Please log in");
    if (url === "/purchase-orders") return canManageInventory(user) ? response(data.purchaseOrders.map((purchaseOrder) => purchaseOrderWithRelations(data, purchaseOrder)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) : fail("Not authorized");
    if (url === "/restock-notes") return canManageInventory(user) ? response(data.restockNotes.map((note) => restockNoteWithRelations(data, note)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) : fail("Not authorized");
    if (url === "/notifications") return user ? response(data.notifications.filter((notification) => notification.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) : fail("Please log in");
    if (url === "/waitlist") {
      if (!canManageInventory(user)) return fail("Not authorized");
      let waitlist = [];
      try { waitlist = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]"); } catch { waitlist = []; }
      return response(waitlist.map((entry, index) => {
        const userId = String(entry.owner ?? "").startsWith("user-") ? Number(String(entry.owner).slice(5)) : null;
        return { id: `${entry.owner}-${entry.productId}-${index}`, ...entry, customer: data.users.find((customer) => customer.id === userId && customer.role === "CUSTOMER"), product: data.products.find((product) => product.id === Number(entry.productId)) };
      }).filter((entry) => entry.customer && entry.product).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)));
    }
    if (url === "/repair-settings") return user ? response(data.repairSettings) : fail("Please log in");
    if (url === "/customers" || url === "/service-tickets/customers") return user?.role === "OWNER" || user?.role === "STAFF" ? response(data.users.filter((entry) => entry.role === "CUSTOMER")) : fail("Not authorized");
    if (url === "/service-tickets") {
      if (!user) return fail("Please log in");
      const tickets = data.tickets.filter((ticket) => user.role === "GUNSMITH" ? ticket.gunsmithId === user.id : user.role === "CUSTOMER" ? ticket.customerId === user.id : true);
      return response(tickets.map((ticket) => ticketWithRelations(data, ticket)));
    }
    if (url.startsWith("/service-tickets/")) {
      const ticket = data.tickets.find((entry) => entry.id === Number(url.split("/").pop()));
      if (!ticket) return fail("Service ticket not found");
      const canView = canManageInventory(user) || (user?.role === "GUNSMITH" && ticket.gunsmithId === user.id) || (user?.role === "CUSTOMER" && ticket.customerId === user.id);
      return canView ? response(ticketWithRelations(data, ticket)) : fail("Not authorized");
    }
    return fail("Demo endpoint not found");
  },

  async post(url, body) {
    const data = state();
    if (url === "/auth/login") {
      const user = data.users.find((entry) => entry.email === body.email && entry.password === body.password);
      if (!user) return fail("Invalid email or password");
      localStorage.setItem(CURRENT_USER_KEY, user.id);
      return response({ token: token(user), user });
    }
    if (url === "/auth/register") {
      if (data.users.some((user) => user.email === body.email)) return fail("Email already registered");
      const user = { id: data.nextIds.user++, name: body.name, email: body.email, phone: body.phone ?? "", password: body.password, role: "CUSTOMER" };
      data.users.push(user); save(data); localStorage.setItem(CURRENT_USER_KEY, user.id);
      return response({ token: token(user), user });
    }
    const user = currentUser(data);
    if (url === "/auth/change-password") { if (!user || user.password !== body.currentPassword) return fail("Current password is incorrect"); user.password = body.newPassword; save(data); return response({ message: "Password changed" }); }
    if (url === "/products") {
      const product = { ...body, id: data.nextIds.product++, price: Number(body.price), quantity: Number(body.quantity), lowStockAt: Number(body.lowStockAt) };
      data.products.push(product); save(data); return response(product);
    }
    if (url === "/purchase-orders") {
      if (!canManageInventory(user)) return fail("Not authorized");
      const items = parseItems(body.items ?? []);
      if (!body.supplierName?.trim()) return fail("Supplier name is required");
      if (!Array.isArray(items) || items.length === 0) return fail("Add at least one product to the purchase order");
      const seenProductKeys = new Set();
      for (const item of items) {
        const isNewProduct = item.itemType === "NEW";
        let productKey;
        if (isNewProduct) {
          const newProduct = item.newProduct ?? {};
          if (!newProduct.sku?.trim() || !newProduct.name?.trim() || !newProduct.category || newProduct.price === "") return fail("SKU, name, category, and selling price are required for every new product");
          if (data.products.some((product) => product.sku.toLowerCase() === newProduct.sku.trim().toLowerCase())) return fail(`SKU ${newProduct.sku.trim()} already exists in the product list`);
          productKey = `new:${newProduct.sku.trim().toLowerCase()}`;
        } else {
          const productId = Number(item.productId);
          if (!data.products.some((product) => product.id === productId)) return fail("One of the selected products no longer exists");
          productKey = `existing:${productId}`;
        }
        if (seenProductKeys.has(productKey)) return fail("Each product can only appear once on a purchase order");
        if (Number(item.orderedQuantity) <= 0) return fail("Every ordered quantity must be greater than zero");
        seenProductKeys.add(productKey);
      }
      const id = data.nextIds.purchaseOrder++;
      const purchaseOrder = {
        id,
        poNumber: `PO-${String(id).padStart(4, "0")}`,
        supplierName: body.supplierName.trim(),
        supplierEmail: body.supplierEmail?.trim() ?? "",
        supplierPhone: body.supplierPhone?.trim() ?? "",
        expectedDate: body.expectedDate || null,
        remarks: body.remarks?.trim() ?? "",
        status: "DRAFT",
        createdAt: now(),
        sentAt: null,
        receivedAt: null,
        createdBy: user.id,
        items: items.map((item, index) => {
          const isNewProduct = item.itemType === "NEW";
          return {
            id: index + 1,
            productId: isNewProduct ? null : Number(item.productId),
            newProduct: isNewProduct ? {
              sku: item.newProduct.sku.trim(),
              name: item.newProduct.name.trim(),
              category: item.newProduct.category,
              price: Number(item.newProduct.price),
              lowStockAt: Math.max(0, Number(item.newProduct.lowStockAt) || 0),
            } : null,
            orderedQuantity: Number(item.orderedQuantity),
            unitCost: Number(item.unitCost) || 0,
            receivedQuantity: 0,
            damagedQuantity: 0,
            missingQuantity: 0,
            inspectionNote: "",
          };
        }),
      };
      data.purchaseOrders.push(purchaseOrder); save(data); return response(purchaseOrderWithRelations(data, purchaseOrder));
    }
    if (url === "/restock-notes") {
      if (!canManageInventory(user)) return fail("Not authorized");
      if (!body.details?.trim()) return fail("Enter note details");
      const note = {
        id: data.nextIds.restockNote++,
        purchaseOrderId: body.purchaseOrderId ? Number(body.purchaseOrderId) : null,
        productId: body.productId ? Number(body.productId) : null,
        type: body.type || "GENERAL",
        quantity: Math.max(0, Number(body.quantity) || 0),
        details: body.details.trim(),
        createdAt: now(),
        createdBy: user.id,
      };
      data.restockNotes.push(note); save(data); return response(restockNoteWithRelations(data, note));
    }
    if (url === "/customers") {
      if (data.users.some((entry) => entry.email === body.email)) return fail("A customer with this email already exists");
      const customer = { id: data.nextIds.user++, name: body.name, email: body.email, phone: body.phone ?? "", password: "CustomerPassword123", role: "CUSTOMER" };
      data.users.push(customer); save(data); return response(customer);
    }
    if (url === "/orders") {
      if (!user) return fail("Please log in");
      const items = parseItems(body.get("items"));
      for (const item of items) { const product = data.products.find((entry) => entry.id === Number(item.productId)); if (!product || product.quantity < Number(item.quantity)) return fail(`${product?.name ?? "Product"} is out of stock`); }
      const subtotal = items.reduce((sum, item) => sum + Number(data.products.find((entry) => entry.id === Number(item.productId)).price) * Number(item.quantity), 0);
      const order = { id: data.nextIds.order++, customerId: user.id, status: "PENDING_VERIFICATION", deliveryAddress: body.get("deliveryAddress"), contactNumber: body.get("contactNumber"), deliveryFee: Number(body.get("deliveryFee") ?? 0), total: subtotal + Number(body.get("deliveryFee") ?? 0), createdAt: now(), items: items.map((item, index) => ({ id: index + 1, productId: Number(item.productId), quantity: Number(item.quantity), unitPrice: data.products.find((entry) => entry.id === Number(item.productId)).price })), proofOfPayment: body.get("proofOfPayment")?.name ?? "payment-proof.png" };
      data.orders.push(order);
      notifyRoles(data, ["OWNER", "STAFF"], { type: "ORDER_ACTION", title: "New order needs verification", message: `Order #${order.id} was submitted with payment proof.`, link: "/dashboard" });
      save(data); return response(order);
    }
    if (url === "/service-tickets") {
      if (!canManageInventory(user)) return fail("Only the owner or staff can create repair tickets");
      if (!data.users.some((entry) => entry.id === Number(body.customerId) && entry.role === "CUSTOMER")) return fail("Select a valid customer");
      const ticket = {
        id: data.nextIds.ticket++,
        customerId: Number(body.customerId),
        gunsmithId: data.users.find((entry) => entry.role === "GUNSMITH")?.id ?? null,
        unitType: body.unitType?.trim(),
        issueReported: body.issueReported?.trim(),
        intakeNotes: body.intakeNotes?.trim() ?? "",
        status: "AWAITING_GUNSMITH",
        createdAt: now(),
        repairStartedAt: null,
        workSubmittedAt: null,
        quoteSentAt: null,
        paidAt: null,
        completedAt: null,
        complexity: null,
        workPerformed: "",
        partsUsed: [],
        partsTotal: 0,
        laborPrice: 0,
        totalPrice: 0,
        paymentMethod: null,
        paymentProof: null,
      };
      data.tickets.push(ticket);
      if (ticket.gunsmithId) addNotification(data, ticket.gunsmithId, { type: "REPAIR_ACTION", title: "New repair ticket assigned", message: `Service ticket #SVC-${ticket.id} for ${ticket.unitType} is waiting for you.`, link: `/repairs/${ticket.id}` });
      addNotification(data, ticket.customerId, { type: "REPAIR_UPDATE", title: "Repair ticket created", message: `Your ${ticket.unitType} was checked in as service ticket #SVC-${ticket.id}.`, link: `/repairs/${ticket.id}` });
      save(data); return response(ticket);
    }
    return fail("Demo endpoint not found");
  },

  async patch(url, body) {
    const data = state();
    const user = currentUser(data);
    if (url === "/notifications/read-all") {
      if (!user) return fail("Please log in");
      data.notifications.filter((notification) => notification.userId === user.id).forEach((notification) => { notification.isRead = true; });
      save(data);
      return response(data.notifications.filter((notification) => notification.userId === user.id));
    }
    if (url.startsWith("/notifications/") && url.endsWith("/read")) {
      if (!user) return fail("Please log in");
      const notification = data.notifications.find((entry) => entry.id === Number(url.split("/")[2]) && entry.userId === user.id);
      if (!notification) return fail("Notification not found");
      notification.isRead = true;
      save(data);
      return response(notification);
    }
    if (url.startsWith("/purchase-orders/")) {
      if (!canManageInventory(user)) return fail("Not authorized");
      const purchaseOrderId = Number(url.split("/")[2]);
      const purchaseOrder = data.purchaseOrders.find((entry) => entry.id === purchaseOrderId);
      if (!purchaseOrder) return fail("Purchase order not found");
      if (url.endsWith("/send")) {
        if (purchaseOrder.status !== "DRAFT") return fail("Only draft purchase orders can be sent");
        purchaseOrder.status = "SENT";
        purchaseOrder.sentAt = now();
        save(data);
        return response(purchaseOrderWithRelations(data, purchaseOrder));
      }
      if (url.endsWith("/receive")) {
        if (purchaseOrder.status !== "SENT") return fail("This purchase order is not awaiting delivery");
        const receivedItems = parseItems(body.items ?? []);
        const checkedItems = [];
        for (const orderedItem of purchaseOrder.items) {
          const receivedItem = receivedItems.find((item) => Number(item.itemId) === orderedItem.id);
          if (!receivedItem) return fail("Check every product on the purchase order");
          const goodQuantity = Math.max(0, Number(receivedItem.goodQuantity) || 0);
          const damagedQuantity = Math.max(0, Number(receivedItem.damagedQuantity) || 0);
          if (goodQuantity + damagedQuantity > orderedItem.orderedQuantity) return fail("Received and damaged quantities cannot exceed the ordered quantity");
          checkedItems.push({ orderedItem, receivedItem, goodQuantity, damagedQuantity, missingQuantity: orderedItem.orderedQuantity - goodQuantity - damagedQuantity });
        }
        for (const checked of checkedItems) {
          let product = data.products.find((entry) => entry.id === checked.orderedItem.productId);
          let previousQuantity = product ? Number(product.quantity) : 0;
          if (!product && checked.orderedItem.newProduct) {
            product = data.products.find((entry) => entry.sku.toLowerCase() === checked.orderedItem.newProduct.sku.toLowerCase());
            previousQuantity = product ? Number(product.quantity) : 0;
            if (!product) {
              product = {
                id: data.nextIds.product++,
                ...checked.orderedItem.newProduct,
                quantity: checked.goodQuantity,
              };
              data.products.push(product);
            } else {
              product.quantity = Number(product.quantity) + checked.goodQuantity;
            }
            checked.orderedItem.productId = product.id;
          } else if (product) {
            product.quantity = Number(product.quantity) + checked.goodQuantity;
          } else {
            return fail("A product on this purchase order no longer exists");
          }
          notifyWaitlistRestock(data, product, previousQuantity);
          checked.orderedItem.receivedQuantity = checked.goodQuantity;
          checked.orderedItem.damagedQuantity = checked.damagedQuantity;
          checked.orderedItem.missingQuantity = checked.missingQuantity;
          checked.orderedItem.inspectionNote = checked.receivedItem.inspectionNote?.trim() ?? "";
          if (checked.damagedQuantity > 0) data.restockNotes.push({ id: data.nextIds.restockNote++, purchaseOrderId: purchaseOrder.id, productId: product.id, type: "DAMAGED", quantity: checked.damagedQuantity, details: checked.orderedItem.inspectionNote || `${checked.damagedQuantity} damaged unit(s) were not added to stock.`, createdAt: now(), createdBy: user.id });
          if (checked.missingQuantity > 0) data.restockNotes.push({ id: data.nextIds.restockNote++, purchaseOrderId: purchaseOrder.id, productId: product.id, type: "MISSING", quantity: checked.missingQuantity, details: checked.orderedItem.inspectionNote || `${checked.missingQuantity} ordered unit(s) were missing from the delivery.`, createdAt: now(), createdBy: user.id });
          if (checked.receivedItem.inspectionNote?.trim() && checked.damagedQuantity === 0 && checked.missingQuantity === 0) data.restockNotes.push({ id: data.nextIds.restockNote++, purchaseOrderId: purchaseOrder.id, productId: product.id, type: "GENERAL", quantity: 0, details: checked.receivedItem.inspectionNote.trim(), createdAt: now(), createdBy: user.id });
        }
        const hasIssues = checkedItems.some((item) => item.damagedQuantity > 0 || item.missingQuantity > 0);
        purchaseOrder.status = hasIssues ? "RECEIVED_WITH_ISSUES" : "RECEIVED";
        purchaseOrder.receivedAt = now();
        save(data);
        return response(purchaseOrderWithRelations(data, purchaseOrder));
      }
      return fail("Demo endpoint not found");
    }
    if (url === "/repair-settings") {
      if (user?.role !== "OWNER") return fail("Only the owner can change repair pricing");
      const complexLaborPrice = Number(body.complexLaborPrice);
      if (complexLaborPrice < 0 || Number.isNaN(complexLaborPrice)) return fail("Enter a valid complex labor price");
      data.repairSettings.complexLaborPrice = complexLaborPrice;
      data.repairSettings.gcashInstructions = body.gcashInstructions?.trim() || data.repairSettings.gcashInstructions;
      save(data);
      return response(data.repairSettings);
    }
    if (url.startsWith("/service-tickets/")) {
      const ticketId = Number(url.split("/")[2]);
      const ticket = data.tickets.find((entry) => entry.id === ticketId);
      if (!ticket) return fail("Service ticket not found");
      const isAssignedGunsmith = user?.role === "GUNSMITH" && ticket.gunsmithId === user.id;
      const isTicketCustomer = user?.role === "CUSTOMER" && ticket.customerId === user.id;

      if (url.endsWith("/start")) {
        if (!isAssignedGunsmith) return fail("Only the assigned gunsmith can start this repair");
        if (ticket.status !== "AWAITING_GUNSMITH") return fail("This ticket is not awaiting a gunsmith");
        ticket.status = "IN_REPAIR";
        ticket.repairStartedAt = now();
        addNotification(data, ticket.customerId, { type: "REPAIR_UPDATE", title: "Repair work started", message: `The gunsmith started working on service ticket #SVC-${ticket.id}.`, link: `/repairs/${ticket.id}` });
      } else if (url.endsWith("/submit-work")) {
        if (!isAssignedGunsmith) return fail("Only the assigned gunsmith can submit repair work");
        if (ticket.status !== "IN_REPAIR") return fail("Start the repair before submitting the work log");
        if (!['SIMPLE', 'COMPLEX'].includes(body.complexity)) return fail("Choose simple or complex labor");
        if (!body.workPerformed?.trim()) return fail("Describe the work performed");
        const requestedParts = parseItems(body.partsUsed ?? []);
        const checkedParts = [];
        const usedProductIds = new Set();
        for (const requestedPart of requestedParts) {
          const productId = Number(requestedPart.productId);
          const quantity = Number(requestedPart.quantity);
          const product = data.products.find((entry) => entry.id === productId);
          if (!product) return fail("One of the selected parts no longer exists");
          if (usedProductIds.has(productId)) return fail("List each repair part only once");
          if (quantity <= 0) return fail("Part quantities must be greater than zero");
          if (Number(product.quantity) < quantity) return fail(`${product.name} only has ${product.quantity} unit(s) in stock`);
          usedProductIds.add(productId);
          checkedParts.push({ product, quantity });
        }
        checkedParts.forEach(({ product, quantity }) => { product.quantity = Number(product.quantity) - quantity; });
        ticket.partsUsed = checkedParts.map(({ product, quantity }, index) => ({ id: index + 1, productId: product.id, sku: product.sku, name: product.name, quantity, unitPrice: Number(product.price), lineTotal: Number(product.price) * quantity }));
        ticket.partsTotal = ticket.partsUsed.reduce((sum, part) => sum + part.lineTotal, 0);
        ticket.complexity = body.complexity;
        ticket.workPerformed = body.workPerformed.trim();
        ticket.gunsmithNotes = body.gunsmithNotes?.trim() ?? "";
        ticket.status = "AWAITING_OWNER_PRICING";
        ticket.workSubmittedAt = now();
        notifyRoles(data, ["OWNER", "STAFF"], { type: "REPAIR_ACTION", title: "Repair needs pricing", message: `The gunsmith submitted work for service ticket #SVC-${ticket.id}.`, link: `/repairs/${ticket.id}` });
      } else if (url.endsWith("/approve-price")) {
        if (!canManageInventory(user)) return fail("Only the owner or staff can approve repair pricing");
        if (ticket.status !== "AWAITING_OWNER_PRICING") return fail("This ticket is not awaiting pricing");
        const laborPrice = ticket.complexity === "COMPLEX" ? Number(data.repairSettings.complexLaborPrice) : Number(body.laborPrice);
        if (laborPrice < 0 || Number.isNaN(laborPrice)) return fail("Enter a valid simple labor price");
        ticket.laborPrice = laborPrice;
        ticket.fixedComplexLaborPrice = ticket.complexity === "COMPLEX" ? laborPrice : null;
        ticket.totalPrice = Number(ticket.partsTotal) + laborPrice;
        ticket.gunsmithPayout = laborPrice;
        ticket.shopPartsRevenue = Number(ticket.partsTotal);
        ticket.status = "AWAITING_PAYMENT";
        ticket.quoteSentAt = now();
        addNotification(data, ticket.customerId, { type: "REPAIR_ACTION", title: "Repair bill ready", message: `Service ticket #SVC-${ticket.id} is ready for payment. Total due: PHP ${ticket.totalPrice.toLocaleString()}.`, link: `/repairs/${ticket.id}` });
      } else if (url.endsWith("/payment-proof")) {
        if (!isTicketCustomer) return fail("Only the ticket customer can submit payment proof");
        if (ticket.status !== "AWAITING_PAYMENT") return fail("This ticket is not awaiting payment");
        const proof = body.get("proofOfPayment");
        if (!proof) return fail("Attach your GCash payment proof");
        ticket.paymentMethod = "GCASH";
        ticket.paymentProof = proof.name ?? "gcash-repair-payment.png";
        ticket.status = "PAYMENT_SUBMITTED";
        ticket.paymentSubmittedAt = now();
        notifyRoles(data, ["OWNER", "STAFF"], { type: "REPAIR_ACTION", title: "GCash proof needs verification", message: `Payment proof was submitted for service ticket #SVC-${ticket.id}.`, link: `/repairs/${ticket.id}` });
      } else if (url.endsWith("/record-payment")) {
        if (!canManageInventory(user)) return fail("Only the owner or staff can confirm payment");
        if (!["AWAITING_PAYMENT", "PAYMENT_SUBMITTED"].includes(ticket.status)) return fail("This ticket is not awaiting payment confirmation");
        const paymentMethod = body.paymentMethod || ticket.paymentMethod;
        if (!["IN_STORE", "GCASH"].includes(paymentMethod)) return fail("Choose in-store or GCash payment");
        ticket.paymentMethod = paymentMethod;
        ticket.status = "PAID_READY_FOR_PICKUP";
        ticket.paidAt = now();
        addNotification(data, ticket.customerId, { type: "REPAIR_UPDATE", title: "Repair ready for pickup", message: `Payment for service ticket #SVC-${ticket.id} was confirmed. Your item is ready for pickup.`, link: `/repairs/${ticket.id}` });
        if (ticket.gunsmithId) addNotification(data, ticket.gunsmithId, { type: "REPAIR_UPDATE", title: "Repair payment confirmed", message: `Labor payment for service ticket #SVC-${ticket.id} was received. Your payout is PHP ${Number(ticket.gunsmithPayout || 0).toLocaleString()}.`, link: `/repairs/${ticket.id}` });
      } else if (url.endsWith("/complete")) {
        if (!canManageInventory(user)) return fail("Only the owner or staff can complete the repair ticket");
        if (ticket.status !== "PAID_READY_FOR_PICKUP") return fail("Confirm payment before completing the ticket");
        ticket.status = "COMPLETED";
        ticket.completedAt = now();
        addNotification(data, ticket.customerId, { type: "REPAIR_UPDATE", title: "Repair ticket completed", message: `Service ticket #SVC-${ticket.id} was completed and the item was returned.`, link: `/repairs/${ticket.id}` });
      } else {
        return fail("Demo endpoint not found");
      }
      save(data);
      return response(ticketWithRelations(data, ticket));
    }
    if (url.startsWith("/products/")) {
      const product = data.products.find((entry) => entry.id === Number(url.split("/").pop()));
      const previousQuantity = Number(product.quantity);
      Object.assign(product, body, { price: Number(body.price), quantity: Number(body.quantity), lowStockAt: Number(body.lowStockAt) });
      notifyWaitlistRestock(data, product, previousQuantity);
      save(data);
      return response(product);
    }
    const orderId = Number(url.split("/")[2]);
    const order = data.orders.find((entry) => entry.id === orderId);
    if (!order) return fail("Order not found");
    if (url.endsWith("/confirm")) {
      for (const item of order.items) data.products.find((product) => product.id === item.productId).quantity -= item.quantity;
      order.status = "PREPARING";
      addNotification(data, order.customerId, { type: "ORDER_UPDATE", title: "Order confirmed", message: `Order #${order.id} is now being prepared.`, link: "/orders" });
    } else if (url.endsWith("/out-for-delivery")) {
      if (!body.deliveryRiderLink) return fail("Enter a valid delivery rider tracking link");
      order.status = "OUT_FOR_DELIVERY";
      order.deliveryRiderLink = body.deliveryRiderLink;
      addNotification(data, order.customerId, { type: "ORDER_UPDATE", title: "Order out for delivery", message: `Order #${order.id} is on the way. Tracking is now available.`, link: "/orders" });
    } else if (url.endsWith("/complete")) {
      order.status = "COMPLETED";
      addNotification(data, order.customerId, { type: "ORDER_UPDATE", title: "Order completed", message: `Order #${order.id} was marked completed.`, link: "/orders" });
    } else if (url.endsWith("/received")) {
      order.status = "COMPLETED";
      notifyRoles(data, ["OWNER", "STAFF"], { type: "ORDER_UPDATE", title: "Customer received an order", message: `Order #${order.id} was confirmed received by the customer.`, link: "/dashboard" });
    } else if (url.endsWith("/reject")) {
      order.status = "REJECTED";
      addNotification(data, order.customerId, { type: "ORDER_UPDATE", title: "Order rejected", message: `Order #${order.id} was rejected. Open My Orders for details.`, link: "/orders" });
    } else if (url.endsWith("/request-proof")) {
      order.status = "PENDING_PAYMENT";
      order.proofOfPayment = null;
      addNotification(data, order.customerId, { type: "ORDER_ACTION", title: "New payment proof required", message: `Please resubmit the payment proof for order #${order.id}.`, link: "/orders" });
    } else if (url.endsWith("/proof-of-payment")) {
      order.status = "PENDING_VERIFICATION";
      order.proofOfPayment = body.get("proofOfPayment")?.name ?? "replacement-proof.png";
      notifyRoles(data, ["OWNER", "STAFF"], { type: "ORDER_ACTION", title: "Replacement proof needs review", message: `New payment proof was submitted for order #${order.id}.`, link: "/dashboard" });
    } else return fail("Demo endpoint not found");
    save(data); return response(withRelations(data, order));
  },

  async delete(url) {
    const data = state();
    if (!url.startsWith("/products/")) return fail("Demo endpoint not found");
    data.products = data.products.filter((product) => product.id !== Number(url.split("/").pop())); save(data); return response();
  },
};

export default api;
