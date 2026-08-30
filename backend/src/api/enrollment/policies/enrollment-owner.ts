/**
 * Strapi policy: enrollment-owner
 * Checks if the authenticated user owns the enrollment or is an admin
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

  // For instructors, allow viewing enrollments for their courses
  if (state.user.role.name === 'Instructor') {
    const enrollment = await strapi.query('api::enrollment.enrollment').findOne({
      where: { id },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!enrollment) {
      return policyContext.forbidden('Enrollment not found');
    }

    if (enrollment.course.instructor.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view enrollments for your own courses.'
      );
    }

    // Instructors can only view, not modify
    if (policyContext.request.method !== 'GET') {
      return policyContext.forbidden('Instructors cannot modify enrollments.');
    }

    return true;
  }

  // For students, verify they own the enrollment
  if (state.user.role.name === 'Student') {
    const enrollment = await strapi.query('api::enrollment.enrollment').findOne({
      where: { id },
      populate: ['student'],
    });

    if (!enrollment) {
      return policyContext.forbidden('Enrollment not found');
    }

    if (enrollment.student.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view your own enrollments.'
      );
    }

    return true;
  }

  return policyContext.forbidden('Insufficient permissions');
};
