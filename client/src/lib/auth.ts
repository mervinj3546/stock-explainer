import type { User } from "@shared/schema";

export interface AuthUser extends Omit<User, 'password'> {}

export const isUnauthorizedError = (error: Error): boolean => {
  return error.message.includes('401') || error.message.includes('Unauthorized');
};

export const getInitials = (user: AuthUser): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return 'U';
};
