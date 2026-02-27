/**
 * FeedbackAlert — shared feedback UI for all exercise types.
 *
 * Renders DaisyUI alert-success or alert-error with standard icon,
 * title, and optional correct-answer display.
 */

interface FeedbackAlertProps {
  isCorrect: boolean;
  correctAnswer?: string;
  correctAnswerDir?: 'rtl' | 'ltr';
  children?: React.ReactNode;
}

export default function FeedbackAlert({
  isCorrect,
  correctAnswer,
  correctAnswerDir = 'ltr',
  children,
}: FeedbackAlertProps) {
  return (
    <div className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        {isCorrect ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )}
      </svg>
      <div>
        <div className="font-bold">{isCorrect ? 'Correct!' : 'Not quite'}</div>
        {!isCorrect && correctAnswer && (
          <div className="text-sm">
            The answer is:{' '}
            <span className="font-semibold" dir={correctAnswerDir} lang="ps">
              {correctAnswer}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
