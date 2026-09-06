const LoginTankerAnimation = ({
  show,
  pumpName,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className="login-tanker-overlay">

      {/* ===============================================
          WELCOME MESSAGE
      =============================================== */}

      <div className="login-success-text">

        <div className="login-welcome-small">
          Welcome to
        </div>

        <div className="login-welcome-pump">
          {pumpName ||
            "ShivShambho"}
        </div>

      </div>

      {/* ===============================================
          ROAD + TANKER
      =============================================== */}

      <div className="login-tanker-road">

        <div className="login-tanker">

          {/* TANK BODY */}

          <div className="tanker-body">

            <div className="tanker-body-shine" />

            <div className="tanker-label">
              PETROL • DIESEL
            </div>

          </div>

          {/* CAB */}

          <div className="tanker-cab">

            <div className="tanker-window" />

            <div className="tanker-grill" />

          </div>

          {/* WHEELS */}

          <div className="tanker-wheel tanker-wheel-1">
            <div className="wheel-center" />
          </div>

          <div className="tanker-wheel tanker-wheel-2">
            <div className="wheel-center" />
          </div>

          <div className="tanker-wheel tanker-wheel-3">
            <div className="wheel-center" />
          </div>

        </div>

      </div>

    </div>
  );
};

export default LoginTankerAnimation;