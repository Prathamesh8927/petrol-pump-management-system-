/* =====================================================
   SUPER ADMIN MIDDLEWARE
===================================================== */

const superAdminMiddleware = (req, res, next) => {
  try {
    /* ===============================================
       AUTHENTICATION CHECK
       authMiddleware should normally run before this.
    =============================================== */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    /* ===============================================
       NORMALIZE ROLE
    =============================================== */

    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    /* ===============================================
       SUPER ADMIN ONLY
    =============================================== */

    if (role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }

    /* ===============================================
       AUTHORIZATION SUCCESS
    =============================================== */

    return next();
  } catch (error) {
    console.error(
      "SUPER ADMIN MIDDLEWARE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify super admin access",
    });
  }
};

export default superAdminMiddleware;