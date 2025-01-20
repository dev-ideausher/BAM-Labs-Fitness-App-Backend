const getWelcomeEmailTemplate = ({ name, email, password }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Platform</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Logo -->
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://res.cloudinary.com/db1ckrpjk/image/upload/v1737206503/x9nbbfa5btebcbcyrdvs.png" 
             alt="Logo" 
             style="width: 200px; height: auto;" />
      </div>

      <!-- Content -->
      <div style="color: #333; line-height: 1.6;">
        <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">
          Welcome, ${name || 'User'}!
        </h2>
        
        <p style="margin-bottom: 15px;">
          Your account has been created successfully. Below are your login details:
        </p>

        <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <p style="margin: 10px 0;">
            <strong style="color: #2c3e50;">Email:</strong> 
            <span style="color: #3498db;">${email}</span>
          </p>
          <p style="margin: 10px 0;">
            <strong style="color: #2c3e50;">Password:</strong> 
            <span style="color: #3498db;">${password}</span>
          </p>
        </div>

        <p style="text-align: center; margin: 25px 0;">
          <a href="[YOUR_LOGIN_URL]" 
             style="background-color: #3498db; 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;">
            Login to Your Account
          </a>
        </p>

        <p style="margin: 20px 0;">
          If you have any questions, our support team is always here to help.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="margin: 5px 0;">Best regards,</p>
          <p style="margin: 5px 0; font-weight: bold; color: #2c3e50;">
            [Your Platform Name] Team
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
      <p>© 2025 [Your Platform Name]. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const getForgotPasswordEmailTemplate = (resetLink) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
      <!-- Header with Logo -->
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
        <img src="https://res.cloudinary.com/db1ckrpjk/image/upload/v1737206503/x9nbbfa5btebcbcyrdvs.png" 
             alt="Logo" 
             style="width: 150px; height: auto; margin-bottom: 10px;"
        />
      </div>

      <!-- Email Content -->
      <div style="padding: 30px 20px;">
        <h1 style="color: #333333; font-size: 24px; margin-bottom: 20px; text-align: center;">Password Reset Request</h1>
        
        <p style="color: #555555; margin-bottom: 15px;">Hello,</p>
        
        <p style="color: #555555; margin-bottom: 20px;">We received a request to reset your password. To proceed with the password reset, please click the button below:</p>
        
        <!-- Reset Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; text-transform: uppercase; font-size: 14px;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #555555; margin-bottom: 15px;">This link will expire in 1 hour for security reasons.</p>
        
        <p style="color: #555555; margin-bottom: 15px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #888888; font-size: 12px;">
        <p style="margin-bottom: 10px;">This is an automated message, please do not reply to this email.</p>
        <p style="margin-bottom: 10px;">For security reasons, please never share this email or the reset link with anyone.</p>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = {
  getForgotPasswordEmailTemplate,
  getWelcomeEmailTemplate,
};
