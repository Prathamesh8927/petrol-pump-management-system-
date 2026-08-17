import jwt from "jsonwebtoken";

const generateToken = (
  user
) => {
  return jwt.sign(
    {
      userId:
        user._id,

      role:
        user.role,

      pumpId:
        user.pumpId,
    },

    process.env.JWT_SECRET,

    {
      /*
        User stays logged in
        for 7 days.
      */

      expiresIn:
        "7d",
    }
  );
};

export default generateToken;