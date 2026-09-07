# ⛽ Shivshambho — Petrol Pump Management System

> **A full-stack business management platform designed to digitize and streamline petrol pump operations.**

**Shivshambho** is a real-world full-stack web application developed to centralize and simplify the day-to-day operational processes of a petrol pump.

The system brings **fuel inventory, nozzle readings, sales, customer ledger, expenses, employees, payments, reporting, and administrative management** into a single platform.

The project was developed around **actual business requirements and successfully delivered to a client**, providing practical experience in transforming business workflows into a functional software product.

---

## 🚀 Project Overview

Traditional petrol pump operations often involve maintaining records across registers, spreadsheets, and separate processes.

Shivshambho provides a centralized digital platform to help manage these operations efficiently while maintaining structured records and providing better visibility into daily business activities.

### 🎯 Key Objectives

* Digitize day-to-day petrol pump operations
* Centralize business and financial records
* Simplify fuel inventory management
* Track nozzle readings and fuel sales
* Manage customer credit and outstanding balances
* Track multiple payment methods
* Generate business reports
* Provide role-based access to different users
* Reduce dependency on manual record keeping

---

## ✨ Key Features

### 📊 Dashboard

* Daily business overview
* Sales insights
* Fuel stock visibility
* Credit and pending amount tracking
* Expense overview
* Payment summaries

### ⛽ Fuel Management

* Petrol inventory management
* Diesel inventory management
* Fuel stock tracking
* Fuel price management
* Stock-related records

### 🔢 Nozzle Management

* Nozzle-wise readings
* Reading history
* Previous and current readings
* Fuel sales calculation based on readings

### 💰 Sales Management

* Daily sales records
* Sales history
* Petrol and diesel sales
* Cash transactions
* UPI transactions
* Card transactions

### 📒 Customer Ledger

* Customer management
* Credit transactions
* Paid amount tracking
* Pending amount tracking
* Transaction history
* Customer-wise records

### 🧾 Expense Management

* Record business expenses
* Expense categorization
* Expense history
* Employee-related expenses

### 👥 Employee Management

* Employee records
* Salary information
* Joining date
* Employee management

### 📈 Reports

* Business reports
* Sales reports
* Expense reports
* Transaction records
* PDF report generation
* Print-friendly reports

### 🔐 Authentication & Authorization

* Secure user authentication
* Protected routes
* Role-based access control
* User-specific permissions

### 👑 Super Admin

* Centralized administration
* Petrol pump management
* User management
* System-level controls
* Administrative monitoring

### ⚙️ Settings

* Petrol pump information
* Business configuration
* Application settings

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Client/User    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │      (Vite)         │
                    └──────────┬──────────┘
                               │
                          REST APIs
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Node.js + Express │
                    │      Backend API    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       MongoDB       │
                    │      Database       │
                    └─────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* React.js
* Vite
* JavaScript
* Material UI
* Bootstrap
* Lucide React
* Recharts

## Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Middleware-based authorization

## Database

* MongoDB
* Mongoose
* MongoDB Atlas

## Development & Deployment

* Git
* GitHub
* Vercel
* Render
* REST API architecture

---

# 📁 Project Structure

```text
Shivshambho/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── server.js
│
├── README.md
└── package.json
```

> Update the structure above if your actual repository structure differs.

---

# 🔑 Application Roles

Shivshambho follows a role-based access model.

### 👑 Super Admin

Responsible for system-level administration such as:

* Managing petrol pumps
* Managing users
* Administrative controls
* Monitoring system-level information

### 👤 Pump/User

Access is focused on day-to-day petrol pump operations such as:

* Dashboard
* Fuel management
* Nozzle readings
* Sales
* Ledger
* Expenses
* Employees
* Reports
* Settings

---

# 🔄 Core Business Workflow

```text
Fuel Stock
     ↓
Nozzle Readings
     ↓
Daily Sales
     ↓
Payment Tracking
     ↓
Customer Ledger
     ↓
Expenses
     ↓
Dashboard & Reports
```

This workflow allows operational data to move through the system in a structured manner and provides centralized visibility for management.

---

# 🔐 Security

The application includes security-focused mechanisms such as:

* JWT-based authentication
* Protected API routes
* Authentication middleware
* Role-based authorization
* Input validation
* Error handling
* Environment-based configuration

Sensitive configuration values are stored using environment variables and are not committed to the repository.

---

# 📊 Reporting

The reporting module provides structured business information that can be used for operational review and record keeping.

Reports include:

* Sales
* Expenses
* Transactions
* Business activity
* Other operational records

The application also supports **PDF generation and print-friendly reports**.

---

# 💻 Installation & Setup

## 1. Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Shivshambho
```

## 2. Install Backend Dependencies

```bash
cd backend
npm install
```

## 3. Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Add any additional environment variables required by your implementation.

## 4. Start Backend

```bash
npm run dev
```

or

```bash
npm start
```

## 5. Install Frontend Dependencies

Open a new terminal:

```bash
cd frontend
npm install
```

## 6. Start Frontend

```bash
npm run dev
```

The application will be available through the local development URL provided by Vite.

---

# 🌐 Deployment

The application is designed for deployment using modern cloud hosting services.

Typical deployment architecture:

```text
React Frontend
      │
      ▼
  Vercel
      │
      │ REST API
      ▼
Node.js / Express Backend
      │
      ▼
MongoDB Atlas
```

Backend deployment can be configured through a suitable Node.js hosting platform.

---

# 📸 Application Preview

Add screenshots of the most important modules here.

### Dashboard

```text
[ Add Dashboard Screenshot ]
```

### Sales Management

```text
[ Add Sales Screenshot ]
```

### Customer Ledger

```text
[ Add Ledger Screenshot ]
```

### Reports

```text
[ Add Reports Screenshot ]
```

---

# 🎥 Product Demonstration

### Main Application Demo

**Duration:** ~1 minute

The demonstration covers the primary operational workflow of Shivshambho.

### Super Admin Demo

**Duration:** ~30 seconds

The demonstration covers system-level administration and management capabilities.

> Add your demo video link here if you host the videos on YouTube or another platform.

---

# 🧠 Engineering Challenges & Learnings

Building Shivshambho provided practical experience in solving problems that arise in real-world applications.

### 1. Business Workflow Modeling

Converted real business processes into structured application workflows and database models.

### 2. Data Relationships

Designed relationships between entities such as:

* Users
* Customers
* Sales
* Fuel
* Nozzles
* Expenses
* Employees
* Reports

### 3. Authentication & Authorization

Implemented protected routes and role-based access to separate operational and administrative functionality.

### 4. Full-Stack Integration

Connected the React frontend with Node.js/Express REST APIs and MongoDB.

### 5. Reporting

Implemented structured reporting and PDF generation for business records.

### 6. Production-Oriented Development

Worked through deployment, configuration, API integration, error handling, and application refinement.

---

# 🎯 Project Outcome

Shivshambho was developed around a **real-world business requirement and successfully delivered to a client**.

The project provided practical experience in taking a solution from:

**Requirement Analysis → System Design → Development → Integration → Testing → Deployment → Client Delivery**

The experience strengthened my understanding of how software engineering can be applied to solve practical business problems.

---

# 📌 Future Enhancements

Potential improvements include:

* 📱 Mobile application
* 📊 Advanced analytics and business intelligence
* 🔔 Automated notifications
* ☁️ Advanced cloud infrastructure
* 📦 Multi-pump analytics
* 📈 Advanced financial reporting
* 🔄 Automated data backup
* 🧠 Predictive sales and inventory insights

---

# 👨‍💻 Developer

**Prathamesh Mandage**

Full-Stack / MERN Developer

Interested in building **real-world software products, business automation systems, and scalable web applications.**

### Connect With Me

🔗 LinkedIn: https://www.linkedin.com/in/prathamesh-mandage-a3a395376

💻 GitHub: https://github.com/Prathamesh8927

📧 Email: prathmesh8927@gmail.com

---

# ⭐ If You Find This Project Interesting

If you’re a developer, recruiter, founder, or business owner interested in the project, feel free to connect and share your feedback.

**Built with the goal of turning real business requirements into practical software.**

---

## 📄 License

Add your preferred license here, such as MIT, if you intend to make the source code open source.
