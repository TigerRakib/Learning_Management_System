/**
 * Strapi policy: progress-owner
 * Checks if the authenticated user is viewing/updating their own progress
 */

export default async (policyContext: any, config: any, { strapi }: any) => {
  const { state } = policyContext;
  const { id } = policyContext.params;

  // Allow admins and content managers to view all
  if (
    state.user.role.name === 'Admin' ||
    state.user.role.name === 'Content Manager'
  ) {
    return true;
  }

  // For instructors, allow viewing progress for their enrolled students
  if (state.user.role.name === 'Instructor') {
    const progress = await strapi.query('api::lesson-progress.lesson-progress').findOne({
      where: { id },
      populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!progress) {
      return policyContext.forbidden('Progress record not found');
    }

    if (progress.lesson.course.instructor.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view progress for your own courses.'
      );
    }

    return true;
  }

  // For students, verify they own the progress record
  if (state.user.role.name === 'Student') {
    const progress = await strapi.query('api::lesson-progress.lesson-progress').findOne({
      where: { id },
      populate: ['student'],
    });

    if (!progress) {
      return policyContext.forbidden('Progress record not found');
    }

    if (progress.student.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view/update your own progress.'
      );
    }

    return true;
  }

  return policyContext.forbidden('Insufficient permissions');
};
