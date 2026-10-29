/**
 * Web-only interface strings that are not (yet) in `@matriq/i18n`.
 *
 * English only: every language falls back to these values, exactly like the
 * shared package falls back to English. Move them into
 * `packages/i18n/src/locales/*` (with Amharic and Afaan Oromoo translations)
 * and delete them here.
 */
export const extraMessages = {
  'lesson.objectives': 'In this chapter you will',
  'lesson.previous': 'Previous chapter',
  'lesson.readXp': 'Lesson read · +{xp} XP',
  'lesson.figure': 'Figure',
  'lesson.input': 'Input (x)',
  'lesson.output': 'Output f(x)',
  'course.empty': 'No lessons for this course yet.',
  'course.emptyBody': 'We are preparing these chapters. Choose another course to keep learning.',
  'course.notAvailable': 'No lessons yet',
  'error.notConfigured':
    'Your account is signed in, but account data is not available on this build yet. You can try the demo meanwhile.',
  'error.notFound': 'We could not find that chapter.',
  'error.offline': 'You are offline. Reconnect and try again.',
  'error.pageNotFound': 'Page not found',
  'error.pageNotFoundBody': 'This page does not exist. Your lessons are one tap away.',
  'demo.exit': 'Exit demo',
  'notifications.soon': 'Notifications are coming soon.',
  'auth.or': 'or',
  'auth.invalidCode': 'That code did not work. Check it and try again.',
  'auth.sendFailed': 'We could not send the code. Try again in a moment.',
  'auth.changeEmail': 'Use a different email',
  'auth.codeHint': 'Enter the 6-digit code from the email.',
  'auth.demoHint': 'No sign-up. Progress stays on this device.',
  'common.skip': 'Skip',
  'common.soonTag': 'Soon',
  'onboarding.gradeRequired': 'Choose your grade.',
  'onboarding.streamRequired': 'Choose your stream.',
  'onboarding.subjectsRequired': 'Choose at least one subject.',
  'onboarding.nameInvalid': 'Use between 1 and 40 characters.',
  'onboarding.failed': 'We could not save your choices. Try again.',
  'profile.name': 'Name',
  'profile.noName': 'Student',
  'profile.editName': 'Change name',
  'profile.targetExam': 'Preparing for',
  'profile.signedIn': 'Signed in with an account',
  'practice.yourAnswer': 'Your answer',
  'progress.best': 'Best score {score}%',
  'results.newBadge': 'New badge',
  'results.xpGained': 'XP gained',
  'settings.deleteSoon': 'Account deletion will be available here soon.',
  'settings.demoData': 'Demo data',
  'settings.saved': 'Saved',
} as const;

export type ExtraMessageKey = keyof typeof extraMessages;
