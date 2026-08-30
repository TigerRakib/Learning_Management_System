/**
 * Strapi policy: course-owner
 * Checks if the authenticated user is the course instructor or an admin
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
    const course = await strapi.query('api::course.course').findOne({
      where: { id },
      populate: ['instructor'],
    });

    if (!course) {
      return policyContext.forbidden('Course not found');
    }

    if (course.instructor.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only manage your own courses.'
      );
    }

    return true;
  }

  // Students cannot modify courses
  return policyContext.forbidden('Insufficient permissions');
};
