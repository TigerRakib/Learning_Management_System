# Ownership Enforcement Implementation - LMS Backend

## Overview

The LMS backend now includes comprehensive ownership enforcement policies and custom controllers to ensure strict role-based access control with ownership validation. This prevents users from accessing or modifying resources they don't own.

## Architecture

### 1. Policy Layer (`/src/policies/` and `/src/api/{contentType}/policies/`)

Policies are Strapi middleware that validate requests before they reach controllers. Five ownership policies have been implemented:

#### **course-owner.ts**
- **Purpose**: Validates course modification permissions
- **Routes Protected**: UPDATE, DELETE operations on courses
- **Logic**:
  - ✅ Admin & Content Manager: Full access to all courses
  - ✅ Instructor: Only own courses (verified via `course.instructor.id === user.id`)
  - ❌ Student: Cannot modify courses

#### **lesson-owner.ts**
- **Purpose**: Validates lesson modification and viewing
- **Routes Protected**: CREATE, UPDATE, DELETE operations on lessons
- **Logic**:
  - ✅ Admin & Content Manager: Full access
  - ✅ Instructor: Only lessons in their courses
  - ✅ Student: Can read lessons (GET) but cannot modify
  - ❌ Student: Cannot create/update/delete lessons

#### **progress-owner.ts**
- **Purpose**: Validates progress record access
- **Routes Protected**: FINDONE, UPDATE, DELETE operations
- **Logic**:
  - ✅ Admin & Content Manager: View all progress
  - ✅ Instructor: View progress for their course students
  - ✅ Student: View/update only their own progress
  - ❌ Student: Cannot access other students' progress

#### **enrollment-owner.ts**
- **Purpose**: Validates enrollment record access
- **Routes Protected**: FINDONE, UPDATE, DELETE operations
- **Logic**:
  - ✅ Admin & Content Manager: Full access
  - ✅ Instructor: View (GET only) enrollments for their courses
  - ✅ Student: View/update their own enrollments
  - ❌ Both: Cannot create/modify enrollments (handled by role-based permissions)

#### **quiz-result-owner.ts**
- **Purpose**: Validates quiz result access
- **Routes Protected**: FINDONE, UPDATE, DELETE operations
- **Logic**:
  - ✅ Admin & Content Manager: View all results
  - ✅ Instructor: View results for their quizzes (cannot modify)
  - ✅ Student: View their own results (cannot modify after submission)
  - ❌ Student: Cannot modify quiz results

### 2. Controller Layer (`/src/api/{contentType}/controllers/`)

Custom controllers override default Strapi behavior to enforce filtering at query time.

#### **course/controllers/course.ts**
```typescript
// Overrides: find(), findOne()
// find() adds automatic filtering based on role:
- Admin/Content Manager: No filter
- Instructor: filters instructor: { id: state.user.id }
- Student: filters publishedAt: { $notNull: true }
- Unauthenticated: filters publishedAt: { $notNull: true }

// findOne() applies same filters and checks publication status
```

#### **lesson/controllers/lesson.ts**
```typescript
// Overrides: find()
// Filtering based on role:
- Admin/Content Manager: No filter
- Instructor: filters course.instructor: { id: state.user.id }
- Student: filters course.publishedAt: { $notNull: true }
- Unauthenticated: filters course.publishedAt: { $notNull: true }
```

#### **lesson-progress/controllers/lesson-progress.ts**
```typescript
// Overrides: find()
// Requires authentication (returns 403 if not authenticated)
// Filtering based on role:
- Admin/Content Manager: No filter
- Instructor: filters lesson.course.instructor: { id: state.user.id }
- Student: filters student: { id: state.user.id }
```

### 3. Route Configuration (`/src/api/{contentType}/routes/`)

Routes are configured to apply policies at the operation level:

```typescript
// Example: Course routes with policies
factories.createCoreRouter('api::course.course', {
  config: {
    update: { policies: ['api::course.courseOwner'] },
    delete: { policies: ['api::course.courseOwner'] },
  },
})
```

Routes protected:
- **course.ts**: UPDATE, DELETE → courseOwner policy
- **lesson.ts**: CREATE, UPDATE, DELETE → lessonOwner policy
- **lesson-progress.ts**: FINDONE, UPDATE, DELETE → progressOwner policy
- **enrollment.ts**: FINDONE, UPDATE, DELETE → enrollmentOwner policy
- **quiz-result.ts**: FINDONE, UPDATE, DELETE → quizResultOwner policy

## Permission Matrix

| Resource | Unauthenticated | Student | Instructor | Admin/Content Manager |
|----------|-----------------|---------|------------|----------------------|
| **Course** | Read published | Read published | CRUD own courses | CRUD all |
| **Lesson** | Read (published course) | Read (published course) | CRUD own course lessons | CRUD all |
| **Progress** | ❌ Forbidden | Read/Update own | Read students in own courses | Read all |
| **Enrollment** | ❌ Forbidden | Read own | Read own courses | Read all |
| **Quiz** | Read (published course) | Read (published course) | CRUD own course quizzes | CRUD all |
| **Quiz Result** | ❌ Forbidden | Read own | Read students in own courses | Read all |

## Key Security Features

### 1. **Multi-Level Enforcement**
- **Route Level**: Policies reject requests at the API gateway
- **Query Level**: Controllers filter results based on role and ownership
- **Database Level**: Only authenticated users can query sensitive data

### 2. **Relationship-Based Access**
Access is based on object relationships:
```
Course owns Lessons → Instructor can manage all lessons in their course
Instructor owns Course → Only that Instructor can modify
Student owns Progress → Only that Student can update their progress
Course has Enrollments → Only enrolled Students can participate
```

### 3. **Published Content Filtering**
- **Courses**: Draft courses visible only to instructor and admins
- **Lessons**: Inherited from course publication status
- **Public Access**: Only published content is visible to unauthenticated users

### 4. **Role Hierarchies**
```
Admin > Content Manager > Instructor > Student
```
- Admin/Content Manager bypass all ownership checks
- Instructors enforce ownership but not for admins
- Students have strict personal data access only

## Implementation Details

### How Policies Work

1. **Route is called** with user context (`state.user`)
2. **Policy function is invoked** with:
   - `policyContext`: Request/response context and params
   - `config`: Policy configuration
   - `{ strapi }`: Strapi instance for queries
3. **Ownership check performed**:
   ```typescript
   const course = await strapi.query('api::course.course').findOne({
     where: { id },
     populate: ['instructor'],
   });
   if (course.instructor.id !== state.user.id) {
     return policyContext.forbidden('You can only manage your own courses.');
   }
   ```
4. **Return `true`** to allow, **call `forbidden()`** to reject

### How Controllers Work

1. **User makes request**: `GET /api/courses`
2. **Controller.find() is called** with modified Koa context
3. **Query is modified** based on role:
   ```typescript
   if (state.user.role.name === 'Instructor') {
     ctx.query.filters = {
       ...ctx.query.filters,
       instructor: { id: state.user.id },
     };
   }
   ```
4. **Default controller executes** filtered query
5. **Results returned** containing only accessible records

## Testing Recommendations

### Test Scenarios

#### **Instructor Access**
```bash
# Should return only their own courses
curl -H "Authorization: Bearer INSTRUCTOR_TOKEN" \
  http://localhost:1337/api/courses

# Should fail if trying to edit another instructor's course
curl -X PUT -H "Authorization: Bearer INSTRUCTOR_TOKEN" \
  http://localhost:1337/api/courses/OTHER_INSTRUCTOR_COURSE_ID \
  -d '{"title": "Hacked Title"}'
# Expected: 403 Forbidden
```

#### **Student Access**
```bash
# Should return only published courses
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:1337/api/courses

# Should return only their own progress
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:1337/api/lesson-progresses

# Should fail if trying to see another student's progress
curl -H "Authorization: Bearer STUDENT_TOKEN" \
  http://localhost:1337/api/lesson-progresses/OTHER_STUDENT_PROGRESS_ID
# Expected: 403 Forbidden
```

#### **Unauthenticated Access**
```bash
# Should return only published courses
curl http://localhost:1337/api/courses

# Should fail when accessing protected resources
curl http://localhost:1337/api/lesson-progresses
# Expected: 403 Forbidden
```

## Error Responses

All ownership violations return HTTP 403 Forbidden with descriptive messages:

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You can only manage your own courses."
}
```

Common messages:
- `"You can only manage your own courses."`
- `"You can only view progress for your own courses."`
- `"You can only view/update your own progress."`
- `"Students cannot modify lessons."`
- `"Instructors cannot modify enrollments."`

## Next Steps

### Frontend Implementation
1. Create authentication pages (login/register)
2. Implement JWT token storage and refresh
3. Build role-based dashboards:
   - Admin: Global course/user management
   - Instructor: Course/lesson CRUD
   - Student: Enrollment and progress tracking

### Additional Security Enhancements
1. Add rate limiting to prevent brute force
2. Implement audit logging for sensitive operations
3. Add two-factor authentication for admins
4. Implement data encryption for sensitive fields

### Performance Optimization
1. Add database indexes on foreign keys
2. Implement query result caching
3. Optimize populate queries to avoid N+1 problems
4. Add pagination to list endpoints

## File Structure

```
backend/
├── src/
│   ├── policies/
│   │   ├── course-owner.ts
│   │   ├── lesson-owner.ts
│   │   ├── progress-owner.ts
│   │   ├── enrollment-owner.ts
│   │   └── quiz-result-owner.ts
│   └── api/
│       ├── course/
│       │   ├── controllers/course.ts (custom with filtering)
│       │   ├── policies/
│       │   │   ├── course-owner.ts
│       │   │   └── index.ts
│       │   └── routes/course.ts (with policies config)
│       ├── lesson/
│       │   ├── controllers/lesson.ts (custom with filtering)
│       │   ├── policies/...
│       │   └── routes/lesson.ts (with policies config)
│       ├── lesson-progress/
│       │   ├── controllers/lesson-progress.ts (custom with filtering)
│       │   ├── policies/...
│       │   └── routes/lesson-progress.ts (with policies config)
│       ├── enrollment/
│       │   ├── policies/...
│       │   └── routes/enrollment.ts (with policies config)
│       └── quiz-result/
│           ├── policies/...
│           └── routes/quiz-result.ts (with policies config)
```

## Compliance & Best Practices

✅ **Implemented**:
- Server-side validation (never trust client)
- Multi-layer enforcement (policies + controllers)
- Clear error messages for debugging
- Consistent error responses
- Role hierarchy with inheritance

✅ **Secured Against**:
- Direct API manipulation
- Cross-user data access
- Unauthorized modifications
- Privilege escalation

## Deployment Notes

When deploying to production:

1. **Environment variables**: Ensure JWT_SECRET is secure
2. **Database**: Run migrations before deploying
3. **Testing**: Run full test suite in staging first
4. **Monitoring**: Log all policy rejections for security audits
5. **Rate Limiting**: Implement on production deployment
6. **CORS**: Configure appropriately for frontend domain

---

**Status**: ✅ Implementation Complete & Build Passing
**Date**: [Current Date]
**Backend Build**: Successful (no TypeScript errors)
