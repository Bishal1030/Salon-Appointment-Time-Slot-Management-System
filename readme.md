# Salon Appointment & Time Slot Management System

A full-stack, enterprise-grade application designed to streamline salon operations. This system handles everything from dynamic time-slot calculation and role-based access control to asynchronous bulk notifications with real-time progress tracking.

## 🌟 Key Features

- **Dynamic Time Slot Management**: Automatically calculates available appointment slots based on configurable working hours, break times, and service durations.
- **Asynchronous Bulk Processing**: Upload Excel files to process hundreds of appointment notifications at once using a robust RabbitMQ queue.
- **Real-Time Dashboards**: Live tracking of background jobs and email delivery statuses via WebSockets (Socket.io).
- **Customizable Notifications**: Admin-defined email templates with dynamic placeholders (e.g., `{{customerName}}`, `{{time}}`).
- **Role-Based Access Control (RBAC)**: Secure routing and API endpoints tailored for Admins and Customers.
- **Retro-Modern UI**: A sleek, high-contrast, minimalist design language optimized for professional workflows.

---

## 🏗️ System Design & Architecture

> *Note: This section outlines the high-level architecture of the system.*

### Core Components
1. **Frontend (Next.js)**
   - Server-Side Rendering (SSR) & Client-Side interactions.
   - Global state and caching managed via `SWR`.
   - Real-time updates established over `Socket.io-client`.
   
2. **Backend (NestJS)**
   - Modular architecture separating Auth, Appointments, and Notifications.
   - Global validation pipes and comprehensive error handling.
   - RESTful endpoints under the `/api/*` prefix and Swagger documentation at `/docs`.

3. **Message Queue (RabbitMQ)**
   - Decouples heavy email delivery tasks from the main HTTP thread.
   - Ensures reliable delivery, retries, and fault tolerance for bulk operations.

4. **Database (PostgreSQL + Prisma)**
   - Strongly typed relational data model.
   - Enforces referential integrity between Users, Services, Appointments, and Jobs.

### Data Flow: Bulk Notifications
1. **Client** uploads `.xlsx` to the `/api/notifications/bulk` endpoint.
2. **Controller** parses the data without strict blocking validation (resilient upload).
3. **Service** creates `BulkJob` and `BulkJobItem` records in the DB and pushes a message to RabbitMQ.
4. **Queue Worker** processes each row:
   - Validates the email and date.
   - Renders the selected notification template.
   - Dispatches the email.
   - Updates the item status (SENT/FAILED) in the database.
   - Emits a WebSocket event (`notification_status` and `bulk_job_status`).
5. **Client** receives the real-time event and instantly updates the UI stream and progress bars.

---

## 🛠️ Technology Stack

**Frontend:**
- [Next.js](https://nextjs.org/) (React Framework)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [SWR](https://swr.vercel.app/) (Data Fetching)
- [Lucide React](https://lucide.dev/) (Icons)
- [Socket.io Client](https://socket.io/) (Real-time events)

**Backend:**
- [NestJS](https://nestjs.com/) (Node.js Framework)
- [Prisma](https://www.prisma.io/) (ORM)
- [PostgreSQL](https://www.postgresql.org/) (Database)
- [RabbitMQ](https://www.rabbitmq.com/) (Message Broker)
- [Nodemailer](https://nodemailer.com/) (Email Service)
- [Socket.io](https://socket.io/) (WebSockets)
- [Swagger](https://swagger.io/) (API Documentation)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL
- RabbitMQ
- pnpm (for frontend and backend)

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `pnpm install`
3. Set up your `.env` file (Database URL, JWT Secret, RabbitMQ credentials, SMTP settings).
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `pnpm run start:dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `pnpm install`
3. Set up your `.env.local` file (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL).
4. Start the development server: `pnpm run dev`

### API Documentation
Once the backend is running, you can access the full Swagger API documentation at:
`http://localhost:3001/docs`
