import Pump from "../models/Pump.js";
import User from "../models/User.js";
import FuelPrice from "../models/FuelPrice.js";

/* =====================================================
   HELPERS
===================================================== */

const getPumpId = (req) => {
  return (
    req.user?.pumpId?._id ||
    req.user?.pumpId ||
    null
  );
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.userId ||
    null
  );
};

/* =====================================================
   GET PUMP SETTINGS
===================================================== */

export const getPumpSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      req.user?.pumpId?._id ||
      req.user?.pumpId ||
      null;

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    const pump =
      await Pump.findById(
        pumpId
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message:
          "Pump not found",
      });
    }

    return res.status(200).json({
      success: true,

      settings: {
        pumpName:
          pump.pumpName || "",

        ownerName:
          pump.ownerName || "",

        phone:
          pump.phone || "",

        email:
          pump.email || "",

        companyName:
          pump.companyName || "",

        dealerCode:
          pump.dealerCode || "",

        gstin:
          pump.gstin || "",

        address:
          pump.address || "",

        city:
          pump.city || "",

        state:
          pump.state || "",

        pincode:
          pump.pincode || "",

        lowStockAlert:
          Number(
            pump.lowStockAlert ??
              1000
          ),

        enableLowStockAlert:
          pump.enableLowStockAlert ??
          true,
      },

      pump,
    });
  } catch (error) {
    console.error(
      "GET PUMP SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load pump settings",
      error: error.message,
    });
  }
};

/* =====================================================
   UPDATE PUMP SETTINGS
===================================================== */

export const updatePumpSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      req.user?.pumpId?._id ||
      req.user?.pumpId ||
      null;

    if (!pumpId) {
      return res.status(400).json({
        success: false,
        message:
          "Pump information not found",
      });
    }

    console.log(
      "UPDATE PUMP SETTINGS:",
      req.body
    );

    const updates = {
      pumpName:
        req.body.pumpName,

      ownerName:
        req.body.ownerName,

      phone:
        req.body.phone,

      email:
        req.body.email,

      companyName:
        req.body.companyName,

      dealerCode:
        req.body.dealerCode,

      gstin:
        req.body.gstin,

      address:
        req.body.address,

      city:
        req.body.city,

      state:
        req.body.state,

      pincode:
        req.body.pincode,

      lowStockAlert:
        req.body.lowStockAlert !==
        undefined
          ? Number(
              req.body.lowStockAlert
            )
          : undefined,

      enableLowStockAlert:
        req.body
          .enableLowStockAlert,
    };

    /*
      Remove undefined values so
      existing settings are not erased.
    */

    Object.keys(
      updates
    ).forEach((key) => {
      if (
        updates[key] ===
        undefined
      ) {
        delete updates[key];
      }
    });

    const pump =
      await Pump.findByIdAndUpdate(
        pumpId,

        {
          $set: updates,
        },

        {
          returnDocument:
            "after",

          runValidators:
            true,
        }
      );

    if (!pump) {
      return res.status(404).json({
        success: false,
        message:
          "Pump not found",
      });
    }

    console.log(
      "PUMP SETTINGS SAVED:",
      pump
    );

    return res.status(200).json({
      success: true,

      message:
        "Pump settings updated successfully",

      settings: {
        pumpName:
          pump.pumpName || "",

        ownerName:
          pump.ownerName || "",

        phone:
          pump.phone || "",

        email:
          pump.email || "",

        companyName:
          pump.companyName || "",

        dealerCode:
          pump.dealerCode || "",

        gstin:
          pump.gstin || "",

        address:
          pump.address || "",

        city:
          pump.city || "",

        state:
          pump.state || "",

        pincode:
          pump.pincode || "",

        lowStockAlert:
          pump.lowStockAlert,

        enableLowStockAlert:
          pump.enableLowStockAlert,
      },

      pump,
    });
  } catch (error) {
    console.error(
      "UPDATE PUMP SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update pump settings",
      error: error.message,
    });
  }
};
/* =====================================================
   GET FUEL SETTINGS
===================================================== */

export const getFuelSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    const prices =
      await FuelPrice.find({
        pumpId,
      });

    const petrol =
      prices.find(
        (item) =>
          item.fuelType ===
          "petrol"
      );

    const diesel =
      prices.find(
        (item) =>
          item.fuelType ===
          "diesel"
      );

    const petrolPrice =
      Number(
        petrol?.price || 0
      );

    const dieselPrice =
      Number(
        diesel?.price || 0
      );

    return res.status(200).json({
      success: true,

      settings: {
        petrolPrice,
        dieselPrice,
      },

      /* compatibility */

      petrolPrice,
      dieselPrice,
    });
  } catch (error) {
    console.error(
      "GET FUEL SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load fuel settings",

      error:
        error.message,
    });
  }
};

/* =====================================================
   UPDATE FUEL SETTINGS
===================================================== */

export const updateFuelSettings = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    console.log(
      "UPDATE FUEL SETTINGS BODY:",
      req.body
    );

    /* =================================================
       PRICE VALUES
    ================================================= */

    const petrolPrice =
      Number(
        req.body?.petrolPrice
      );

    const dieselPrice =
      Number(
        req.body?.dieselPrice
      );

    /* =================================================
       VALIDATION
    ================================================= */

    if (
      !Number.isFinite(
        petrolPrice
      ) ||
      petrolPrice <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Petrol selling price must be greater than zero",
      });
    }

    if (
      !Number.isFinite(
        dieselPrice
      ) ||
      dieselPrice <= 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Diesel selling price must be greater than zero",
      });
    }

    /* =================================================
       PETROL
    ================================================= */

    const petrol =
      await FuelPrice.findOneAndUpdate(
        {
          pumpId,

          fuelType:
            "petrol",
        },

        {
          $set: {
            price:
              petrolPrice,
          },
        },

        {
          upsert: true,

          returnDocument:
            "after",

          runValidators:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    /* =================================================
       DIESEL
    ================================================= */

    const diesel =
      await FuelPrice.findOneAndUpdate(
        {
          pumpId,

          fuelType:
            "diesel",
        },

        {
          $set: {
            price:
              dieselPrice,
          },
        },

        {
          upsert: true,

          returnDocument:
            "after",

          runValidators:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    console.log(
      "PETROL PRICE SAVED:",
      petrol?.price
    );

    console.log(
      "DIESEL PRICE SAVED:",
      diesel?.price
    );

    return res.status(200).json({
      success: true,

      message:
        "Fuel prices updated successfully",

      settings: {
        petrolPrice:
          Number(
            petrol.price
          ),

        dieselPrice:
          Number(
            diesel.price
          ),
      },
    });
  } catch (error) {
    console.error(
      "UPDATE FUEL SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to update fuel settings",

      error:
        error.message,
    });
  }
};

/* =====================================================
   GET PUMP USERS
===================================================== */

export const getPumpUsers = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    const users =
      await User.find({
        pumpId,
      })
        .select(
          "-password"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      count:
        users.length,

      users,
    });
  } catch (error) {
    console.error(
      "GET PUMP USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to load users",

      error:
        error.message,
    });
  }
};

/* =====================================================
   ADD PUMP USER
===================================================== */

export const addPumpUser = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    const {
      name,
      email,
      password,
      role = "staff",
    } = req.body;

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "User name is required",
      });
    }

    if (
      !email ||
      !String(email).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Email is required",
      });
    }

    if (
      !password ||
      String(password).length <
        6
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Password must contain at least 6 characters",
      });
    }

    const normalizedEmail =
      String(email)
        .trim()
        .toLowerCase();

    const existingUser =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,

        message:
          "A user with this email already exists",
      });
    }

    /*
      If User.js has a pre-save password
      hashing hook, password will be
      hashed automatically.
    */

    const user =
      await User.create({
        name:
          String(name).trim(),

        email:
          normalizedEmail,

        password,

        role,

        pumpId,

        active: true,

        isActive: true,
      });

    const safeUser = {
      _id:
        user._id,

      name:
        user.name,

      email:
        user.email,

      role:
        user.role,

      active:
        user.active ??
        user.isActive ??
        true,

      pumpId:
        user.pumpId,

      createdAt:
        user.createdAt,
    };

    return res.status(201).json({
      success: true,

      message:
        "User added successfully",

      user:
        safeUser,
    });
  } catch (error) {
    console.error(
      "ADD PUMP USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to add user",

      error:
        error.message,
    });
  }
};

/* =====================================================
   UPDATE PUMP USER
===================================================== */

export const updatePumpUser = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    const {
      userId,
    } = req.params;

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,

        message:
          "User ID is required",
      });
    }

    const user =
      await User.findOne({
        _id:
          userId,

        pumpId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "User not found",
      });
    }

    const {
      name,
      email,
      role,
      active,
      isActive,
    } = req.body;

    if (
      name !==
      undefined
    ) {
      user.name =
        String(
          name
        ).trim();
    }

    if (
      email !==
      undefined
    ) {
      const normalizedEmail =
        String(email)
          .trim()
          .toLowerCase();

      const duplicate =
        await User.findOne({
          email:
            normalizedEmail,

          _id: {
            $ne:
              userId,
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,

          message:
            "Another user already uses this email",
        });
      }

      user.email =
        normalizedEmail;
    }

    if (
      role !==
      undefined
    ) {
      user.role =
        role;
    }

    if (
      active !==
      undefined
    ) {
      user.active =
        Boolean(active);

      user.isActive =
        Boolean(active);
    }

    if (
      isActive !==
      undefined
    ) {
      user.isActive =
        Boolean(
          isActive
        );

      user.active =
        Boolean(
          isActive
        );
    }

    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "User updated successfully",

      user: {
        _id:
          user._id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        active:
          user.active ??
          user.isActive ??
          true,

        pumpId:
          user.pumpId,
      },
    });
  } catch (error) {
    console.error(
      "UPDATE PUMP USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to update user",

      error:
        error.message,
    });
  }
};

/* =====================================================
   DELETE PUMP USER
===================================================== */

export const deletePumpUser = async (
  req,
  res
) => {
  try {
    const pumpId =
      getPumpId(req);

    const {
      userId,
    } = req.params;

    if (!pumpId) {
      return res.status(400).json({
        success: false,

        message:
          "Pump information not found",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,

        message:
          "User ID is required",
      });
    }

    /*
      Prevent currently logged in
      user deleting themselves.
    */

    const currentUserId =
      String(
        getUserId(req) ||
          ""
      );

    if (
      currentUserId &&
      currentUserId ===
        String(userId)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "You cannot delete your own account",
      });
    }

    const user =
      await User.findOneAndDelete({
        _id:
          userId,

        pumpId,
      });

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "User not found",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "User deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE PUMP USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to delete user",

      error:
        error.message,
    });
  }
};