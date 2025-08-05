import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from '@tauri-apps/api/window';

import "./styles.css";

// Types
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_path?: string;
}

interface OrderItem {
  product_id: number;
  quantity: number;
  product: Product;
}

interface Order {
  id: number;
  created_at: string;
  buyer: string;
  products: OrderItem[];
  payment_method: string;
  delivery_service: string;
  coupon_code?: string;
  subtotal: number;
  tax: number;
  total: number;
}

// Mock Tauri commands for web development
const mockInvoke = async (command: string, args?: any): Promise<any> => {
  console.log(`Mock invoke: ${command}`, args);
  
  switch (command) {
    case 'get_products':
      return getSampleProducts();
    case 'get_orders':
      return [];
    case 'get_coupons':
      return [];
    case 'create_order':
      const order = args.order;
      return {
        ...order,
        id: Math.floor(Math.random() * 1000) + 1,
        created_at: new Date().toISOString()
      };
    default:
      throw new Error(`Unknown command: ${command}`);
  }
};

// State management
class PizzaPOSApp {
  private products: Product[] = [];
  private orders: Order[] = [];
  private currentCart: OrderItem[] = [];
  private currentTab: 'products' | 'new-order' | 'orders' = 'products';
  private isWebMode: boolean = false;

  // Modal state
  private modalOpen: boolean = false;
  private modalMode: 'add' | 'edit' = 'add';
  private modalProduct: Product | null = null;
  private modalError: string = '';

  constructor() {
    this.init();
  }

  async init() {
    // Check if we're in Tauri or web mode
    this.isWebMode = !(window as any).__TAURI__;
    await this.loadData();
    this.setupEventListeners();
    this.render();
  }

  async loadData() {
    try {
      if (this.isWebMode) {
        // Use mock data for web development
        this.products = getSampleProducts();
        this.orders = [];
      } else {
        // Load products, orders, and coupons from backend
        this.products = await invoke('get_products');
        this.orders = await invoke('get_orders');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Initialize with sample data for development
      this.products = getSampleProducts();
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.getElementById('tab-products')?.addEventListener('click', () => this.switchTab('products'));
    document.getElementById('tab-new-order')?.addEventListener('click', () => this.switchTab('new-order'));
    document.getElementById('tab-orders')?.addEventListener('click', () => this.switchTab('orders'));

    // Search functionality
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.toLowerCase();
        this.filterProducts(query);
      });
    }

    // Cart actions
    document.getElementById('clear-cart')?.addEventListener('click', () => this.clearCart());
    document.getElementById('complete-order')?.addEventListener('click', () => this.completeOrder());
  }

  switchTab(tab: 'products' | 'new-order' | 'orders') {
    this.currentTab = tab;
    this.render();
  }

  filterProducts(query: string) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;

    const filteredProducts = this.products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );

    this.renderProductGrid(filteredProducts, productGrid);
  }

  addToCart(product: Product) {
    const existingItem = this.currentCart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.currentCart.push({
        product_id: product.id,
        quantity: 1,
        product: product
      });
    }

    this.updateCartDisplay();
  }

  removeFromCart(productId: number) {
    this.currentCart = this.currentCart.filter(item => item.product_id !== productId);
    this.updateCartDisplay();
  }

  updateQuantity(productId: number, quantity: number) {
    const item = this.currentCart.find(item => item.product_id === productId);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        item.quantity = quantity;
      }
    }
    this.updateCartDisplay();
  }

  clearCart() {
    this.currentCart = [];
    this.updateCartDisplay();
  }

  updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartContainer || !cartTotal) return;

    cartContainer.innerHTML = '';
    
    let total = 0;
    
    this.currentCart.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      total += itemTotal;

      const itemElement = document.createElement('div');
      itemElement.className = 'flex items-center justify-between p-3 border-b border-gray-200';
      itemElement.innerHTML = `
        <div class="flex items-center space-x-3">
          <span class="text-2xl">${item.product.image_path || '🍕'}</span>
          <div>
            <div class="font-semibold">${item.product.name}</div>
            <div class="text-sm text-gray-600">$${item.product.price.toFixed(2)}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center" 
                  onclick="app.updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
          <span class="w-8 text-center">${item.quantity}</span>
          <button class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center" 
                  onclick="app.updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
          <button class="ml-2 text-red-500 hover:text-red-700" 
                  onclick="app.removeFromCart(${item.product_id})">×</button>
        </div>
      `;
      cartContainer.appendChild(itemElement);
    });

    cartTotal.textContent = `$${total.toFixed(2)}`;
  }

  async completeOrder() {
    if (this.currentCart.length === 0) {
      alert('Please add items to cart first');
      return;
    }

    const buyer = (document.getElementById('buyer-name') as HTMLInputElement)?.value || 'Walk-in Customer';
    const paymentMethod = (document.getElementById('payment-method') as HTMLSelectElement)?.value || 'Cash';
    const deliveryService = (document.getElementById('delivery-service') as HTMLSelectElement)?.value || 'None';

    const subtotal = this.currentCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const tax = subtotal * 0.16; // 16% tax
    const total = subtotal + tax;

    const order: Omit<Order, 'id' | 'created_at'> = {
      buyer,
      products: this.currentCart,
      payment_method: paymentMethod,
      delivery_service: deliveryService,
      subtotal,
      tax,
      total
    };

    try {
      let newOrder: Order;
      if (this.isWebMode) {
        newOrder = await mockInvoke('create_order', { order }) as Order;
      } else {
        newOrder = await invoke('create_order', { order }) as Order;
      }
      
      this.orders.unshift(newOrder);
      this.clearCart();
      this.switchTab('orders');
      alert('Order completed successfully!');
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to create order. Please try again.');
    }
  }

  // Modal logic
  showAddProductModal() {
    this.modalMode = 'add';
    this.modalProduct = { id: 0, name: '', description: '', price: 0, image_path: '' };
    this.modalError = '';
    this.openModal();
  }

  showEditProductModal(product: Product) {
    this.modalMode = 'edit';
    this.modalProduct = { ...product };
    this.modalError = '';
    this.openModal();
  }

  openModal() {
    this.modalOpen = true;
    this.renderModal();
  }

  closeModal() {
    this.modalOpen = false;
    this.modalProduct = null;
    this.modalError = '';
    this.renderModal();
  }

  async handleModalSubmit() {
    if (!this.modalProduct) return;
    const { name, price } = this.modalProduct;
    if (!name.trim() || price <= 0) {
      this.modalError = 'Name and price are required.';
      this.renderModal();
      return;
    }
    try {
      if (this.modalMode === 'add') {
        if (this.isWebMode) {
          const newProduct = { ...this.modalProduct, id: Math.floor(Math.random() * 10000) };
          this.products.push(newProduct);
        } else {
          await invoke('create_product', { product: this.modalProduct });
        }
      } else if (this.modalMode === 'edit') {
        if (this.isWebMode) {
          const idx = this.products.findIndex(p => p.id === this.modalProduct!.id);
          if (idx !== -1) this.products[idx] = { ...this.modalProduct };
        } else {
          await invoke('update_product', { product: this.modalProduct });
        }
        // Update cart items if product is in cart
        this.currentCart.forEach(item => {
          if (item.product_id === this.modalProduct!.id) {
            item.product = { ...this.modalProduct! };
          }
        });
      }
      // Always reload products from backend/mock after mutation
      await this.loadData();
      this.closeModal();
      this.render();
    } catch (e) {
      this.modalError = 'Failed to save product. : ' + e;
      this.renderModal(); 
    }
  }

  async handleDeleteProduct(productId: number) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      if (this.isWebMode) {
        this.products = this.products.filter(p => p.id !== productId);
      } else {
        await invoke('delete_product', { id: productId });
      }
      // Remove from cart if present
      this.currentCart = this.currentCart.filter(item => item.product_id !== productId);
      // Always reload products from backend/mock after mutation
      await this.loadData();
      this.render();
    } catch (e) {
      alert('Failed to delete product.');
    }
  }

  renderProductGrid(products: Product[], container: HTMLElement) {
    container.innerHTML = '';
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'pizza-card p-4 relative group';
      productCard.innerHTML = `
        <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
          <button class="rounded-full bg-gray-100 hover:bg-gray-200 p-2 shadow" title="Edit" onclick="app.showEditProductModal(app.products.find(p=>p.id===${product.id}))">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" /></svg>
          </button>
          <button class="rounded-full bg-gray-100 hover:bg-red-100 p-2 shadow" title="Delete" onclick="app.handleDeleteProduct(${product.id})">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="text-center">
          <div class="text-4xl mb-2">${product.image_path || '🍕'}</div>
          <h3 class="font-semibold text-lg mb-1">${product.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${product.description}</p>
          <div class="text-lg font-bold text-primary">$${product.price.toFixed(2)}</div>
        </div>
      `;
      productCard.onclick = (e) => {
        // Prevent modal open if clicking edit/delete
        if ((e.target as HTMLElement).closest('button')) return;
        this.addToCart(product);
      };
      container.appendChild(productCard);
    });
  }

  renderModal() {
    let modal = document.getElementById('product-modal');
    if (!this.modalOpen) {
      if (modal) modal.remove();
      return;
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'product-modal';
      document.body.appendChild(modal);
    }
    const p = this.modalProduct || { name: '', description: '', price: 0, image_path: '' };
    modal.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative animate-fade-in" style="font-family: var(--font-sans);">
          <button class="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onclick="app.closeModal()" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 class="text-xl font-bold mb-4 text-primary">${this.modalMode === 'add' ? 'Add Product' : 'Edit Product'}</h2>
          <form id="product-form" class="space-y-4" autocomplete="off">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent" value="${p.name || ''}" id="product-name" required maxlength="64">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent" id="product-description" maxlength="128">${p.description || ''}</textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Price</label>
              <input type="number" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent" value="${p.price || ''}" id="product-price" min="0.01" step="0.01" required>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Emoji / Image</label>
              <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent" value="${p.image_path || ''}" id="product-image" maxlength="8" placeholder="🍕">
            </div>
            ${this.modalError ? `<div class="text-red-500 text-sm">${this.modalError}</div>` : ''}
            <div class="flex justify-end gap-2 mt-6">
              <button type="button" class="pizza-button-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="pizza-button">${this.modalMode === 'add' ? 'Add' : 'Save'}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    // Attach form handler
    setTimeout(() => {
      const form = document.getElementById('product-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          // Read values
          const name = (document.getElementById('product-name') as HTMLInputElement).value;
          const description = (document.getElementById('product-description') as HTMLTextAreaElement).value;
          const price = parseFloat((document.getElementById('product-price') as HTMLInputElement).value);
          const image_path = (document.getElementById('product-image') as HTMLInputElement).value;
          this.modalProduct = { ...this.modalProduct!, name, description, price, image_path };
          this.handleModalSubmit();
        };
      }
    }, 0);
  }

  render() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    appContainer.innerHTML = `
      <div class="min-h-screen bg-background">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center">
                <h1 class="text-2xl font-bold text-primary">🍕 Pizza POS</h1>
              </div>
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600">${this.isWebMode ? 'Web Mode' : 'Offline Mode'}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Navigation Tabs -->
        <nav class="bg-white border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex space-x-8">
              <button id="tab-products" class="py-4 px-1 border-b-2 font-medium text-sm ${
                this.currentTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }">
                Products
              </button>
              <button id="tab-new-order" class="py-4 px-1 border-b-2 font-medium text-sm ${
                this.currentTab === 'new-order' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }">
                New Order
              </button>
              <button id="tab-orders" class="py-4 px-1 border-b-2 font-medium text-sm ${
                this.currentTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }">
                Orders
              </button>
            </div>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          ${this.renderCurrentTab()}
        </main>
      </div>
    `;

    this.setupEventListeners();
  }

  renderCurrentTab() {
    switch (this.currentTab) {
      case 'products':
        return this.renderProductsTab();
      case 'new-order':
        return this.renderNewOrderTab();
      case 'orders':
        return this.renderOrdersTab();
      default:
        return this.renderProductsTab();
    }
  }

  renderProductsTab() {
    return `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-900">Product Management</h2>
          <button class="pizza-button" onclick="app.showAddProductModal()">
            + Add Product
          </button>
        </div>
        
        <div class="relative">
          <input type="text" id="search-input" placeholder="Search products..." 
                 class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
        </div>
        
        <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        </div>
      </div>
    `;
  }

  renderNewOrderTab() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Product Grid -->
        <div class="lg:col-span-2">
          <div class="space-y-6">
            <div class="relative">
              <input type="text" id="search-input" placeholder="Search products..." 
                     class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            </div>
            
            <div id="product-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            </div>
          </div>
        </div>
        
        <!-- Cart -->
        <div class="lg:col-span-1">
          <div class="pizza-card p-6">
            <h3 class="text-lg font-semibold mb-4">Order Summary</h3>
            
            <!-- Customer Info -->
            <div class="space-y-4 mb-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input type="text" id="buyer-name" placeholder="Walk-in Customer" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select id="payment-method" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="Cash">Cash</option>
                  <option value="Card - Visa">Card - Visa</option>
                  <option value="Card - Mastercard">Card - Mastercard</option>
                  <option value="Card - AMEX">Card - AMEX</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Service</label>
                <select id="delivery-service" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="None">None (Walk-in)</option>
                  <option value="Uber Eats">Uber Eats</option>
                  <option value="DoorDash">DoorDash</option>
                  <option value="GrubHub">GrubHub</option>
                  <option value="In-house">In-house Delivery</option>
                </select>
              </div>
            </div>
            
            <!-- Cart Items -->
            <div class="border-t border-gray-200 pt-4">
              <div id="cart-items" class="space-y-2 max-h-64 overflow-y-auto">
                <!-- Cart items will be populated here -->
              </div>
              
              <div class="border-t border-gray-200 pt-4 mt-4">
                <div class="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span id="cart-total">$0.00</span>
                </div>
              </div>
              
              <div class="mt-6 space-y-2">
                <button id="complete-order" class="w-full pizza-button">
                  Complete Order
                </button>
                <button id="clear-cart" class="w-full pizza-button-secondary">
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderOrdersTab() {
    return `
      <div class="space-y-6">
        <pre id="print-receipt" style="display:none; white-space: pre;"></pre>

        <h2 class="text-2xl font-bold text-gray-900">Order History</h2>
        
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          
          <div class="divide-y divide-gray-200">
            ${this.orders.map(order => `
              <div class="px-6 py-4 hover:bg-gray-50 cursor-pointer" onclick="app.showOrderDetails(${order.id})">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-gray-900">Order #${order.id}</div>
                    <div class="text-sm text-gray-500">${order.buyer} • ${order.payment_method}</div>
                    <div class="text-sm text-gray-500">${new Date(order.created_at).toLocaleString()}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-semibold text-gray-900">$${order.total.toFixed(2)}</div>
                    <div class="text-sm text-gray-500">${order.delivery_service}</div>
                  </div>
                </div>
                
                <div id="details-${order.id}" class="px-6 py-4 hidden bg-gray-50">
                  <!-- Details will be rendered here -->
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderOrderDetails(orderId:Number) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const itemsHtml = order.products.map(item => `
        <li class="flex justify-between py-1">
          <span>${item.product.name} x ${item.quantity}</span>
          <span>$${(item.product.price * item.quantity).toFixed(2)}</span>
        </li>
      `).join("");
  
    const couponHtml = order.coupon_code
      ? `<p>Coupon: ${order.coupon_code}</p>`
      : "";
  
    const html = `
      <div class="space-y-4">
        ${couponHtml}
        <ul class="border-t pt-2">${itemsHtml}</ul>
        <div class="text-right space-y-1">
          <p>Subtotal: $${order.subtotal.toFixed(2)}</p>
          <p>Tax: $${order.tax.toFixed(2)}</p>
          <p class="font-semibold">Total: $${order.total.toFixed(2)}</p>
        </div>
        <button
          class="bg-green-600 text-white px-4 py-2 rounded"
          onclick="app.printTicket(${orderId})">
          🧾 Print Receipt
        </button>
      </div>`;

      
    const container = document.getElementById(`details-${order.id}`);
    if(!container) return
    container.innerHTML = html;
    container.classList.remove('hidden');
  }
  

  showOrderDetails(orderId:Number) {
    const container = document.getElementById(`details-${orderId}`);
    if (!container) return;
  
    const isExpanded = !container.classList.contains('hidden');
    if (isExpanded) {
      container.classList.add('hidden');
      container.innerHTML = '';
    } else {
      this.renderOrderDetails(orderId);
    }
  }
  

  async printTicket(orderId: Number) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    // Format the ticket text
    const itemsText = order.products
      .map(item => `${item.quantity} x ${item.product.name} - $${(item.product.price * item.quantity).toFixed(2)}`)
      .join('\n');
      
      const ticket = `\n🍕 PIZZA POS RECEIPT 🍕\n=========================
      Order #: ${order.id}
      Date: ${order.created_at}
      Customer: ${order.buyer}
      Payment: ${order.payment_method}
      Delivery: ${order.delivery_service}
      \nITEMS:\n${itemsText}\n=========================
      Subtotal: $${order.subtotal.toFixed(2)}
      Tax (16%): $${order.tax.toFixed(2)}
      Total: $${order.total.toFixed(2)}\nThank you for your order!\n=========================`;

      // Now the rest of the logic:
      if (this.isWebMode) {
        alert('Printing is only available in offline (Tauri) mode.\n\n' + ticket);
        return;
      }

      try {
        // Dynamically import the Tauri printer plugin
        // @ts-ignore
        const { print } = await import('@tauri-apps/plugin-printer');
        await print({
          jobName: `PizzaPOS_Order_${order.id}`,
          data: ticket,
          printer: undefined, // Use default printer
          silent: false, // Show print dialog
        });
      } catch (e) {
        alert('Failed to print receipt: ' + e);
      }
  }
}


// Helper function for sample products
function getSampleProducts(): Product[] {
  return [
    { id: 1, name: "Margherita", description: "Classic tomato and mozzarella", price: 12.99, image_path: "🍕" },
    { id: 2, name: "Pepperoni", description: "Spicy pepperoni with cheese", price: 14.99, image_path: "🍕" },
    { id: 3, name: "Hawaiian", description: "Ham and pineapple", price: 13.99, image_path: "🍕" },
    { id: 4, name: "Supreme", description: "All toppings included", price: 16.99, image_path: "🍕" },
    { id: 5, name: "BBQ Chicken", description: "BBQ sauce with chicken", price: 15.99, image_path: "🍕" },
    { id: 6, name: "Veggie Delight", description: "Fresh vegetables only", price: 13.99, image_path: "🍕" },
  ];
}

// Initialize the app
const app = new PizzaPOSApp();

// Make app globally available for onclick handlers
(window as any).app = app;
