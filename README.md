# LMS Project

Learning management system built as two applications:

- `frontend/` - Next.js application for the user interface
- `backend/` - Strapi CMS/API backed by PostgreSQL

## Architecture Overview

### Backend Features
- **Role-Based Access Control**: 4 roles (Admin, Content Manager, Instructor, Student)
- **Ownership Enforcement**: Strict validation to prevent unauthorized access
  - Instructors can only manage their own courses and lessons
  - Students can only access their own progress and enrolled courses
  - Admin/Content Manager can access all resources
- **Draft Content**: Courses can be in draft/published states
  - Only instructors and admins see draft courses
  - Students only see published courses
- **Content Types**: Blog, Course, Lesson, Quiz, Enrollment, Progress

For detailed security documentation, see [backend/OWNERSHIP_ENFORCEMENT.md](backend/OWNERSHIP_ENFORCEMENT.md)

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer for local Strapi development

Check your Node.js and npm versions:

```powershell
node --version
npm --version
```

## Project Setup

Install dependencies in each application:

```powershell
cd frontend
npm install

cd ..\backend
npm install
```

## PostgreSQL Setup

Create a local PostgreSQL database named `lms`:

```powershell
createdb -U postgres lms
```

If `createdb` is not available, create a database named `lms` in pgAdmin.

Create or update `backend/.env` with your local database credentials:

```env
HOST=0.0.0.0
PORT=1337

DATABASE_CLIENT=postgres
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=lms
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-postgres-password
DATABASE_SSL=false
```

Keep `backend/.env` private. Use `backend/.env.example` as the template for required Strapi secrets, and replace all placeholder secret values before sharing or deploying the application.

## Run Locally

Start the Strapi backend in one terminal:

```powershell
cd backend
npm run develop
```

The Strapi admin panel is available at [http://localhost:1337/admin](http://localhost:1337/admin). Create the first administrator account when prompted.

Start the Next.js frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

The frontend is available at [http://localhost:3000](http://localhost:3000).

## Security

This LMS implements comprehensive ownership enforcement:

### What's Secured
- ✅ **Course Management**: Only instructors can modify their own courses
- ✅ **Lesson Access**: Students can only see lessons from enrolled courses
- ✅ **Progress Tracking**: Students can only view/update their own progress
- ✅ **Quiz Results**: Students cannot modify results after submission
- ✅ **Enrollment**: Only admins can create/modify enrollments

### Testing the Security
See [backend/OWNERSHIP_ENFORCEMENT.md](backend/OWNERSHIP_ENFORCEMENT.md) for detailed testing scenarios.

## Useful Commands

### Frontend

```powershell
cd frontend
npm run dev       # Start development server
npm run lint      # Run ESLint
npm run build     # Create production build
npm run start     # Start production server
```

### Backend

```powershell
cd backend
npm run develop   # Start Strapi with auto-reload
npm run build     # Build the Strapi admin panel
npm run start     # Start Strapi in production mode
```

## Deployment Notes

For Railway deployment:

1. Create a PostgreSQL service in Railway.
2. Deploy the Strapi backend as its own service.
3. Set the Strapi environment variables in Railway, including `DATABASE_URL` or the individual `DATABASE_*` values and all required secret values.
4. Deploy the Next.js frontend as a separate service.
5. Configure the frontend with the public URL of the Strapi API.

Do not commit database passwords, API tokens, JWT secrets, or other credentials. Use Railway environment variables for production configuration.

## Documentation

- [Next.js documentation](https://nextjs.org/docs)
- [Strapi documentation](https://docs.strapi.io)
- [Railway documentation](https://docs.railway.com)
