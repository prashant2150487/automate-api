
import User from '../models/User.js';


// Register a new user
export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password
    });

    // Generate token
    const token = user.getJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// // Login user
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check for user
//     const user = await User.findOne({ email }).select('+password');
//     if (!user) {
//       return res.status(401).json({ success: false, message: 'Invalid credentials' });
//     }

//     // Check password
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ success: false, message: 'Invalid credentials' });
//     }

//     // Generate token
//     const token = user.getJwtToken();

//     res.status(200).json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Get current user profile
// export const getUserProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('-password');
//     res.status(200).json({ success: true, user });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Update user profile
// export const updateUserProfile = async (req, res) => {
//   try {
//     const updates = Object.keys(req.body);
//     const allowedUpdates = ['firstName', 'lastName', 'email', 'phoneNumber', 'addresses'];
//     const isValidOperation = updates.every(update => allowedUpdates.includes(update));

//     if (!isValidOperation) {
//       return res.status(400).json({ success: false, message: 'Invalid updates!' });
//     }

//     const user = await User.findByIdAndUpdate(req.user.id, req.body, {
//       new: true,
//       runValidators: true
//     }).select('-password');

//     res.status(200).json({ success: true, user });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Forgot password
// export const forgotPassword = async (req, res) => {
//   try {
//     const user = await User.findOne({ email: req.body.email });

//     if (!user) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     // Get reset token
//     const resetToken = user.getResetPasswordToken();

//     await user.save({ validateBeforeSave: false });

//     // Create reset URL
//     const resetUrl = `${req.protocol}://${req.get('host')}/api/users/resetpassword/${resetToken}`;

//     const message = `You are receiving this email because you (or someone else) has requested to reset your password. Please make a PUT request to: \n\n ${resetUrl}`;

//     try {
//       await sendEmail({
//         email: user.email,
//         subject: 'Password reset token',
//         message
//       });

//       res.status(200).json({ success: true, message: 'Email sent' });
//     } catch (error) {
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpire = undefined;
//       await user.save({ validateBeforeSave: false });

//       return res.status(500).json({ success: false, message: 'Email could not be sent' });
//     }
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Reset password
// export const resetPassword = async (req, res) => {
//   try {
//     // Get hashed token
//     const resetPasswordToken = crypto
//       .createHash('sha256')
//       .update(req.params.resettoken)
//       .digest('hex');

//     const user = await User.findOne({
//       resetPasswordToken,
//       resetPasswordExpire: { $gt: Date.now() }
//     });

//     if (!user) {
//       return res.status(400).json({ success: false, message: 'Invalid or expired token' });
//     }

//     // Set new password
//     user.password = req.body.password;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
//     await user.save();

//     // Generate token
//     const token = user.getJwtToken();

//     res.status(200).json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Update password
// export const updatePassword = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).select('+password');

//     // Check current password
//     const isMatch = await user.comparePassword(req.body.currentPassword);
//     if (!isMatch) {
//       return res.status(401).json({ success: false, message: 'Current password is incorrect' });
//     }

//     user.password = req.body.newPassword;
//     await user.save();

//     // Generate token
//     const token = user.getJwtToken();

//     res.status(200).json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };