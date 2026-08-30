/**
 * Strapi policy: lesson-owner
 * Checks if the authenticated user owns the course that contains this lesson
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const { state } = policyContext;
  const { id } = policyContext.params;

  // Allow admins and content managers
  if (
    state.user.role.name === 'Admin' ||
    state.user.role.name === 'Content Manager'
  ) {
    return true;
  }

  // For instructors, verify they own the course
  if (state.user.role.name === 'Instructor') {
    const lesson = await strapi.query('api::lesson.lesson').findOne({
      where: { id },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!lesson) {
      return policyContext.forbidden('Lesson not found');
    }

    if (lesson.course.instructor.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only manage lessons in your own courses.'
      );
    }

    return true;
  }

  // Students can read lessons but not modify
  if (state.user.role.name === 'Student') {
    // Only allow GET requests
    if (policyContext.request.method === 'GET') {
      return true;
    }
    return policyContext.forbidden('Students cannot modify lessons.');
  }

  return policyContext.forbidden('Insufficient permissions');
};
