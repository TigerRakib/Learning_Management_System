/**
 * Strapi policy: quiz-result-owner
 * Checks if the authenticated user owns the quiz result
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

  // For instructors, allow viewing quiz results for their quizzes
  if (state.user.role.name === 'Instructor') {
    const quizResult = await strapi.query('api::quiz-result.quiz-result').findOne({
      where: { id },
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!quizResult) {
      return policyContext.forbidden('Quiz result not found');
    }

    if (quizResult.quiz.course.instructor.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view quiz results for your own courses.'
      );
    }

    // Instructors can only view, not modify
    if (policyContext.request.method !== 'GET') {
      return policyContext.forbidden('Instructors cannot modify quiz results.');
    }

    return true;
  }

  // For students, verify they own the quiz result
  if (state.user.role.name === 'Student') {
    const quizResult = await strapi.query('api::quiz-result.quiz-result').findOne({
      where: { id },
      populate: ['student'],
    });

    if (!quizResult) {
      return policyContext.forbidden('Quiz result not found');
    }

    if (quizResult.student.id !== state.user.id) {
      return policyContext.forbidden(
        'You can only view your own quiz results.'
      );
    }

    // Students can view but not modify
    if (policyContext.request.method !== 'GET') {
      return policyContext.forbidden('You cannot modify a quiz result after submission.');
    }

    return true;
  }

  return policyContext.forbidden('Insufficient permissions');
};
