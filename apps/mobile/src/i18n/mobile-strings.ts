/**
 * Interface strings the mobile app needs that are not (yet) in @matriq/i18n.
 * English only; like @matriq/i18n, every language falls back to English.
 * Move these into packages/i18n (with Amharic and Afaan Oromoo translations)
 * when the tech lead next updates the shared package.
 */
export const mobileStrings = {
  'm.auth.codeHint': 'Enter the 6-digit code from the email.',
  'm.auth.invalidCode': 'That code did not work. Check it and try again.',
  'm.auth.changeEmail': 'Use a different email',
  'm.auth.resend': 'Send a new code',
  'm.auth.or': 'or',
  'm.auth.demoHint': 'No account needed. Progress stays on this device.',
  'm.auth.rateLimited': 'Too many attempts. Wait a minute and try again.',
  'm.gate.accountUnavailable':
    'Your account data is not available on this build yet. Try again later, or explore the demo.',
  'm.gate.useDemo': 'Explore the demo instead',
  'm.home.streakA11y': '{count} day streak. Open progress.',
  'm.home.languageA11y': 'App language: {language}. Change language.',
  'm.home.goalA11y': 'Daily goal: {minutes} of {goal} minutes studied today',
  'm.learn.noCourse': 'Lessons for {subject} are coming soon. Mathematics is ready now.',
  'm.learn.chapterA11y': 'Chapter {number}: {title}. {status}',
  'm.learn.current': 'Current chapter',
  'm.lesson.objectives': 'In this chapter you will',
  'm.lesson.previous': 'Previous chapter',
  'm.lesson.markedRead': 'Lesson marked as read',
  'm.lesson.plotInput': 'Input (x)',
  'm.lesson.plotOutput': 'Output f(x)',
  'm.practice.questionOf': '{current} / {total}',
  'm.practice.yourAnswer': 'Your answer',
  'm.practice.optionA11y': 'Option {label}: {body}',
  'm.practice.empty': 'This chapter has no practice questions yet.',
  'm.results.score': 'Correct answers',
  'm.results.newBadge': 'New badge',
  'm.profile.guest': 'Student',
  'm.profile.demoAccount': 'Demo · saved on this device',
  'm.profile.signedInAs': 'Signed in as {email}',
  'm.settings.exitDemo': 'Exit demo',
  'm.settings.stream': 'Stream',
  'm.settings.chooseStream': 'Choose your stream to see grade {grade} subjects.',
  'm.course.streamNeeded': 'Grades 11 and 12 study in a stream.',
  'm.course.subjectA11y': '{subject}, grade {grade}. Change course.',
  'm.onboarding.namePlaceholder': 'Your first name',
  'm.onboarding.skip': 'Skip',
  'm.close.sheet': 'Close',
  'm.week.studied': 'studied',
  'm.notFound': 'This page does not exist.',
  'm.goHome': 'Go to Home',
  'm.tutor.body':
    'Ask questions about a lesson and get step-by-step help. For now, practice questions include sample hints.',
  'm.revision.body':
    'Short revision cards for the chapters you have studied. For now, open a chapter and choose Quick notes.',
  'm.library.body': 'Curated lesson videos and notes for each chapter.',
} as const;

export type MobileMessageKey = keyof typeof mobileStrings;
