const allowRoles =
  (...roles) =>
  (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required",
        });
      }

      const role =
        String(
          req.user.role || ""
        ).toLowerCase();

      if (
        !roles.includes(role)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to perform this action",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Unable to verify user permission",
      });
    }
  };

export default allowRoles;