const { Resend } = require("resend");
const config = require("../config/config");

const resend = new Resend(config.resend.apiKey);

const sendEmail = async (emailData) => {
    try {
      const { to, subject, html } = emailData;
  
      if (!config.resend.fromEmail || !to) {
        throw new Error("Missing sender or recipient email address");
      }
  
      const response = await resend.emails.send({
        from: config.resend.fromEmail,
        to,
        subject,
        html,
      });
  
      console.log("Resend Response:", response);
      return response;
    } catch (error) {
      console.error("Resend Email Error:", {
        message: error.message,
        details: error.response ? error.response.body : "No response body",
      });
  
      throw new Error(`Failed to send email: ${error.message}`);
    }
  };
  

module.exports = { sendEmail };