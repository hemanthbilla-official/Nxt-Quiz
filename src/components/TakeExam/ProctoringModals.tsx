interface ProctoringModalsProps {
  showTabWarning: boolean;
  setShowTabWarning: (show: boolean) => void;
  isFullScreen: boolean;
  loading: boolean;
  fullscreenRequired: boolean;
  enterFullScreen: () => void;
}

export function ProctoringModals({
  showTabWarning,
  setShowTabWarning,
  isFullScreen,
  loading,
  fullscreenRequired,
  enterFullScreen,
}: ProctoringModalsProps) {
  return (
    <>
      {showTabWarning && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="card p-8 max-w-md w-full text-center border-danger/30">
            <div className="w-16 h-16 rounded bg-danger/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Warning!
            </h2>
            <p className="text-danger font-semibold mb-4">
              Tab switch detected
            </p>
            <p className="text-muted-foreground mb-8 text-sm">
              Your activity has been logged and reported to the administrator.
              Multiple violations may lead to disqualification.
            </p>
            <button
              onClick={() => setShowTabWarning(false)}
              className="w-full py-3 rounded bg-danger text-primary-foreground font-bold hover:opacity-90 transition-opacity duration-150"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {fullscreenRequired && !isFullScreen && !loading && (
        <div className="fixed inset-0 z-[100] bg-background/80 flex items-center justify-center p-4 overflow-hidden">
          <div className="card p-8 max-w-md w-full text-center border-primary/20">
            <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Full Screen Required
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              To maintain the integrity of the examination, you must stay in
              full screen mode. Leaving full screen is recorded as an event.
            </p>
            <button
              onClick={enterFullScreen}
              className="w-full py-3 rounded bg-primary text-primary-foreground font-bold hover:bg-primary-hover transition-colors duration-150"
            >
              Enter Full Screen to Continue
            </button>
            <p className="mt-6 text-[10px] text-muted-foreground uppercase tracking-widest">
              Standard Examination Protocol
            </p>
          </div>
        </div>
      )}
    </>
  );
}
