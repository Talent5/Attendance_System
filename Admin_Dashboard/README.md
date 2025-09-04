# Admin Dashboard

A React.js admin dashboard for managing students and attendance with JWT authentication.

## Features

- **Authentication**: JWT-based authentication for admin and teacher roles
- **Student Management**: Add, edit, delete students with form validation
- **ID Card Generation**: Print student ID cards with QR codes
- **Attendance Tracking**: View and filter attendance records
- **Responsive Design**: TailwindCSS for modern, responsive UI
- **Export Functionality**: Export attendance data to CSV

## Technology Stack

- **Frontend**: React 19.1.1 + Vite
- **Styling**: TailwindCSS 4.1.12
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **QR Code Generation**: qrcode library

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5174`

## Demo Mode

The application includes a demo mode that works without a backend. Demo credentials:

- **Admin**: admin@school.com / password
- **Teacher**: teacher@school.com / password

## Backend Integration

To connect to a real backend, set `USE_DEMO_MODE = false` in service files and ensure backend is hosted at `https://attendance-system-sktv.onrender.com`.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
