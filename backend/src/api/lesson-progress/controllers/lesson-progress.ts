/**
 * lesson-progress controller
 * Custom controller to enforce ownership filtering
 */

import { factories } from '@strapi/strapi';
import type { Context } from 'koa';

const defaultController = factories.createCoreController(
  'api::lesson-progress.lesson-progress'
);

export default {
  ...defaultController,

  /**
   * Override find to filter progress based on user role and ownership
   */
  async find(ctx: Context) {
    const { state } = ctx as any;

    // Require authentication
    if (!state.user) {
      return ctx.forbidden('You must be authenticated to view progress');
    }

    // Admin and Content Manager can see all progress
    if (
      state.user.role.name === 'Admin' ||
      state.user.role.name === 'Content Manager'
    ) {
      return (defaultController as any).find(ctx);
    }

    // Instructor can see progress for students in their courses
    if (state.user.role.name === 'Instructor') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        lesson: {
          course: {
            instructor: { id: state.user.id },
          },
        },
      };
      return (defaultController as any).find(ctx);
    }

    // Student can see only their own progress
    if (state.user.role.name === 'Student') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        student: { id: state.user.id },
      };
      return (defaultController as any).find(ctx);
    }

    return ctx.forbidden('Insufficient permissions');
  },
};
