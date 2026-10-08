const LoginTankerAnimation = ({
  show,
  pumpName,
}) => {
  if (!show) {
    return null;
  }

  const displayPumpName =
    String(
      pumpName || ""
    ).trim() ||
    "ShivShambho";

  return (
    <div
      className="login-tanker-overlay"
      role="status"
      aria-live="polite"
      aria-label={`Welcome to ${displayPumpName}`}
    >
      {/* ===============================================
          WELCOME MESSAGE
      =============================================== */}

      <div className="login-success-text">
        <div className="login-welcome-small">
          Welcome to
        </div>

        <div className="login-welcome-pump">
          {displayPumpName}
        </div>
      </div>

      {/* ===============================================
          ROAD + TANKER
      =============================================== */}

      <div className="login-tanker-road">
        <div className="login-tanker">

          {/* TANK BODY */}

          <div className="tanker-body">
            <div
              className="tanker-body-shine"
              aria-hidden="true"
            />

            <div className="tanker-label">
              PETROL • DIESEL
            </div>
          </div>

          {/* CAB */}

          <div className="tanker-cab">
            <div
              className="tanker-window"
              aria-hidden="true"
            />

            <div
              className="tanker-grill"
              aria-hidden="true"
            />
          </div>

          {/* WHEELS */}

          <div
            className="tanker-wheel tanker-wheel-1"
            aria-hidden="true"
          >
            <div className="wheel-center" />
          </div>

          <div
            className="tanker-wheel tanker-wheel-2"
            aria-hidden="true"
          >
            <div className="wheel-center" />
          </div>

          <div
            className="tanker-wheel tanker-wheel-3"
            aria-hidden="true"
          >
            <div className="wheel-center" />
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginTankerAnimation;