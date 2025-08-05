# 🍕 Pizza POS - Desktop Application

A modern, lightweight desktop Point of Sale application for pizza restaurants. Built with Tauri (Rust + WebView) and Tailwind CSS 4, designed to run smoothly on older hardware with offline capabilities.

## ✨ Features

### 🛍️ Product Management
- **CRUD Operations**: Add, edit, delete, and search products
- **Product Grid**: Visual product cards with images and pricing
- **Search Functionality**: Real-time search by name or description

### 🛒 Order Management
- **Interactive Cart**: Click-to-add products with quantity controls
- **Customer Information**: Optional customer name entry
- **Payment Methods**: Cash, Card (Visa, Mastercard, AMEX), Other
- **Delivery Services**: Uber Eats, DoorDash, GrubHub, In-house
- **Tax Calculation**: Automatic 16% tax calculation
- **Order Completion**: Save orders to local SQLite database

### 📋 Order History
- **Order Tracking**: View all completed orders with details
- **Order Details**: Click to view full order information
- **Filtering**: Filter by payment method, date, delivery service

### 🧾 Receipt Printings
- **Auto-Print**: Automatic receipt printing after order completion
- **Detailed Receipts**: Complete order information with totals

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or higher)
2. **Rust** (for full Tauri functionality)
   - Install from [https://rust-lang.org](https://rust-lang.org)
   - Or use the web version without Rust

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PizzaTauriSellPoint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the application**

   **Web Version (No Rust required):**
   ```bash
   npm run web
   ```
   Open http://localhost:3000 in your browser

   **Desktop Version (Requires Rust):**
   ```bash
   npm run tauri dev
   ```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: TypeScript, Tailwind CSS 4, Vite
- **Backend**: Rust with Tauri
- **Database**: SQLite (embedded)
- **UI Framework**: Custom components with Tailwind CSS

### Project Structure
```
PizzaTauriSellPoint/
├── src/                    # Frontend TypeScript code
│   ├── main.ts            # Main application logic
│   └── styles.css         # Tailwind CSS 4 configuration
├── src-tauri/             # Rust backend
│   ├── src/lib.rs         # Database and API logic
│   └── Cargo.toml         # Rust dependencies
├── index.html             # HTML entry point
└── package.json           # Node.js dependencies
```

## 🎨 Design System

### Color Palette
- **Primary**: Tomato Red (#FF6347)
- **Secondary**: Light Grey (#F8F9FA)
- **Accent**: Sea Green (#2E8B57)
- **Background**: Soft Grey (#F3F4F6)

### Components
- **Pizza Cards**: Hover effects with smooth transitions
- **Modern Buttons**: Primary and secondary button styles
- **Responsive Grid**: Adapts to different screen sizes
- **Material Design**: Clean, modern interface

## 📊 Data Models

### Product
```typescript
{
  id: number;
  name: string;
  description: string;
  price: number;
  image_path?: string;
}
```

### Order
```typescript
{
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
```

## 🔧 Development

### Available Scripts
- `npm run web` - Run web version (development)
- `npm run tauri dev` - Run desktop version (requires Rust)
- `npm run build` - Build for production
- `npm run tauri build` - Build desktop executable

### Database
The application uses SQLite for local data storage:
- **Location**: `pizza_pos.db` (created automatically)
- **Tables**: products, orders, coupons
- **Sample Data**: Pre-loaded with 6 sample pizza products

### Adding Features
1. **Frontend**: Modify `src/main.ts` for UI changes
2. **Backend**: Add commands in `src-tauri/src/lib.rs`
3. **Styling**: Update `src/styles.css` with Tailwind CSS 4

## 🧪 Testing

### Manual Testing Checklist
- [ ] Product search functionality
- [ ] Add items to cart
- [ ] Update quantities in cart
- [ ] Complete order with different payment methods
- [ ] View order history
- [ ] Responsive design on different screen sizes

### Sample Data
The application comes with 6 sample pizza products:
1. Margherita ($12.99)
2. Pepperoni ($14.99)
3. Hawaiian ($13.99)
4. Supreme ($16.99)
5. BBQ Chicken ($15.99)
6. Veggie Delight ($13.99)

## 🚀 Deployment

### Desktop Application
```bash
npm run tauri build
```
This creates platform-specific executables in `src-tauri/target/release/`

### Web Application
```bash
npm run build
```
Deploy the `dist/` folder to any web server.

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🆘 Support

For issues or questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include system information and error messages

---

**Built with ❤️ using Tauri and Tailwind CSS 4**
