//igonre this file for now
import nodemailer from "nodemailer";
import EmailLog from "../models/emaillog.js";
import FailedEmail from "../models/failedschema.js";
import dotenv from "dotenv";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  family: 4,
  pool: false,
});

transporter.verify((err) => {
  if (err) {
    console.error(" SMTP Connection Failed:", err.message);
    console.error("   Please check your email configuration in .env file");
    console.error(
      `   Host: ${process.env.SMTP_HOST}, Port: ${process.env.SMTP_PORT}`
    );
    console.error(`   User: ${process.env.SMTP_USER}`);
    console.error(`   Secure: ${process.env.SMTP_SECURE}`);
    if (process.env.SMTP_PORT === "465" && process.env.SMTP_SECURE !== "true") {
      console.error("     WARNING: Port 465 requires SMTP_SECURE=true");
    }
  } else {
    console.log(" Email service ready");
  }
});

async function renderTemplate(templateName, data) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatePath = path.join(__dirname, "..", "views", templateName);
  return await ejs.renderFile(templatePath, data);
}

async function sendMail(to, subject, text, html, shouldLog = true) {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to,
    subject,
    text: text || (html ? html.replace(/<[^>]*>/g, "") : ""),
    html,
  };

  let emailLog = null;

  if (shouldLog) {
    emailLog = await EmailLog.create({
      to,
      from: process.env.MAIL_FROM,
      subject,
      html: html || "",
      status: "pending",
    }).catch(() => null);
  }

  try {
    console.log(`Sending email to ${to}...`);
    console.log(
      ` Email config - Host: ${process.env.SMTP_HOST}, Port: ${process.env.SMTP_PORT}, User: ${process.env.SMTP_USER}`
    );
    const result = await transporter.sendMail(mailOptions);
    console.log(` Email sent successfully to ${to}`);

    if (shouldLog && emailLog) {
      await EmailLog.findByIdAndUpdate(emailLog._id, {
        status: "sent",
        messageId: result?.messageId || null,
        sentAt: new Date(),
      });
    }

    return { success: true, result };
  } catch (error) {
    console.error(` Email failed to ${to}:`, error.message);

    if (shouldLog && emailLog) {
      await EmailLog.findByIdAndUpdate(emailLog._id, {
        status: "failed",
        error: error.message,
        failedAt: new Date(),
      });

      await FailedEmail.create({
        to,
        subject,
        html,
        error: error.message,
        status: "pending",
        retryCount: 0,
      }).catch(() => null);
    }

    throw error;
  }
}

async function sendSMSWithLogging(to, message, shouldLog = true) {
  let smsLog = null;

  if (shouldLog) {
    smsLog = await SMSLog.create({ to, message, status: "pending" }).catch(
      () => null
    );
  }

  try {
    const providerResponse = await sendSMS(to, message, false);

    if (shouldLog && smsLog) {
      await SMSLog.findByIdAndUpdate(smsLog._id, {
        status: "sent",
        providerId: providerResponse?.id || providerResponse?.msgid || null,
        sentAt: new Date(),
      });
    }

    return { success: true, providerResponse };
  } catch (error) {
    if (shouldLog && smsLog) {
      await SMSLog.findByIdAndUpdate(smsLog._id, {
        status: "failed",
        error: error.message,
      });

      await FailedSMS.create({
        to,
        message,
        error: error.message,
        smsLogRef: smsLog._id,
        status: "pending",
        retryCount: 0,
      }).catch(() => null);
    }

    throw error;
  }
}

// ========== EMAIL ONLY FUNCTION ==========
export async function sendEmail({
  email,
  emailTemplate,
  emailData,
  emailSubject,
  shouldLog = true,
}) {
  const result = { success: false, error: null };

  if (email && emailTemplate) {
    try {
      const html = await renderTemplate(emailTemplate, emailData);
      await sendMail(email, emailSubject, null, html, shouldLog);
      result.success = true;
      if (shouldLog) console.log(` Email sent successfully to ${email}`);
    } catch (err) {
      console.error(" Email sending error:", err.message);
      result.error = err.message;
    }
  } else {
    console.log("Email skipped - no address or template provided");
  }

  return result;
}

// ========== SMS ONLY FUNCTION ==========
export async function sendOnlySMS({
  phoneNumber,
  smsTemplate,
  smsParams = [],
  shouldLog = true,
}) {
  const result = {
    success: false,
    error: null,
  };

  if (!phoneNumber || !smsTemplate) {
    return {
      success: false,
      error: "Phone number or SMS template missing",
    };
  }

  try {
    const message = getSMSTemplate(smsTemplate, ...smsParams);
    await sendSMSWithLogging(phoneNumber, message, shouldLog);
    console.log(`SMS sent to ${phoneNumber}`);
    result.success = true;
  } catch (err) {
    console.error("SMS error:", err.message);
    result.error = err.message;
  }

  return result;
}

// ========== EMAIL AND SMS BOTH ==========
export async function sendEmailAndSMS({
  email,
  phoneNumber,
  emailTemplate,
  emailData,
  emailSubject,
  smsTemplate,
  smsParams = [],
  shouldLog = true,
}) {
  const results = {
    email: { success: false, error: null },
    sms: { success: false, error: null },
  };

  if (email && emailTemplate) {
    try {
      const html = await renderTemplate(emailTemplate, emailData);
      await sendMail(email, emailSubject, null, html, shouldLog);
      results.email.success = true;
    } catch (err) {
      console.error("Email sending error:", err.message);
      results.email.error = err.message;
    }
  }

  if (phoneNumber && smsTemplate) {
    try {
      const message = getSMSTemplate(smsTemplate, ...smsParams);
      await sendSMSWithLogging(phoneNumber, message, shouldLog);
      results.sms.success = true;
      console.log(`SMS process completed for ${phoneNumber}`);
    } catch (err) {
      console.error(" SMS sending error:", err.message);
      console.log(`SMS failed but continuing with email-only mode`);
      results.sms.error = err.message;
    }
  } else {
    console.log(`SMS skipped - no phone number or template provided`);
  }

  return results;
}

// ========== TEMPLATE FUNCTIONS FOR 7 EMAILS ==========

// 1. Transaction Created/Recorded
export async function sendTransactionCreated({
  email,
  phoneNumber,
  name,
  transactionId,
  amount,
  status,
  recordedAt,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    transactionId,
    amount,
    status: status || "pending",
    recordedAt: recordedAt || new Date().toLocaleString("en-IN"),
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "transaction.ejs",
      emailData,
      emailSubject: `Transaction Recorded - ${transactionId}`,
      smsTemplate: "TRANSACTION_RECORDED",
      smsParams: [name, transactionId],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "transaction.ejs",
      emailData,
      emailSubject: `Transaction Recorded - ${transactionId}`,
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "TRANSACTION_RECORDED",
      smsParams: [name, transactionId],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 2. Payment Received
export async function sendPaymentReceived({
  email,
  phoneNumber,
  name,
  amount,
  mode,
  paymentDate,
  utr,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    amount,
    mode: mode || "UPI",
    paymentDate: paymentDate || new Date().toLocaleString("en-IN"),
    utr: utr || "N/A",
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "payment.ejs",
      emailData,
      emailSubject: `Payment Received - ₹${amount}`,
      smsTemplate: "PAYMENT_RECEIVED",
      smsParams: [name, amount],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "payment.ejs",
      emailData,
      emailSubject: `Payment Received - ₹${amount}`,
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "PAYMENT_RECEIVED",
      smsParams: [name, amount],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 3. Login OTP
export async function sendLoginOTP({
  email,
  phoneNumber,
  name,
  otp,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    otp,
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "login.otp.ejs",
      emailData,
      emailSubject: "Your Login OTP - Admission Management System",
      smsTemplate: "LOGIN_OTP",
      smsParams: [otp],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "login.otp.ejs",
      emailData,
      emailSubject: "Your Login OTP - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "LOGIN_OTP",
      smsParams: [otp],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 4. Account Created
export async function sendAccountCreated({
  email,
  phoneNumber,
  name,
  mobile,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    mobile: mobile || "N/A",
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "account.create.ejs",
      emailData,
      emailSubject:
        "Account Created Successfully - Admission Management System",
      smsTemplate: "ACCOUNT_CREATED",
      smsParams: [name],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "account.create.ejs",
      emailData,
      emailSubject:
        "Account Created Successfully - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "ACCOUNT_CREATED",
      smsParams: [name],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 5. Admission Submitted
export async function sendAdmissionSubmitted({
  email,
  phoneNumber,
  name,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "admission.submitted.ejs",
      emailData,
      emailSubject: "Admission Request Submitted - Admission Management System",
      smsTemplate: "ADMISSION_SUBMITTED",
      smsParams: [name],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "admission.submitted.ejs",
      emailData,
      emailSubject: "Admission Request Submitted - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "ADMISSION_SUBMITTED",
      smsParams: [name],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 6. Admission Confirmed
export async function sendAdmissionConfirmed({
  email,
  phoneNumber,
  name,
  collegeName,
  courseName,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    collegeName: collegeName || "Selected College",
    courseName: courseName || "Selected Course",
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "admission.confirmed.ejs",
      emailData,
      emailSubject: "Admission Confirmed - Admission Management System",
      smsTemplate: "ADMISSION_ACCEPTED",
      smsParams: [name],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "admission.confirmed.ejs",
      emailData,
      emailSubject: "Admission Confirmed - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "ADMISSION_ACCEPTED",
      smsParams: [name],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

// 7. Enquiry Received
export async function sendEnquiryReceived({
  email,
  phoneNumber,
  name,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "enquiry.ejs",
      emailData,
      emailSubject: "Enquiry Received - Admission Management System",
      smsTemplate: "ENQUIRY_SUBMITTED",
      smsParams: [name],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "enquiry.ejs",
      emailData,
      emailSubject: "Enquiry Received - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "ENQUIRY_SUBMITTED",
      smsParams: [name],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

export async function sendPasswordResetOTP({
  email,
  phoneNumber,
  name,
  otp,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
    otp,
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "password.reset.otp.ejs",
      emailData,
      emailSubject: "Your password reset OTP - Admission Management System",
      smsTemplate: "LOGIN_OTP",
      smsParams: [otp],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "password.reset.otp.ejs",
      emailData,
      emailSubject: "Your password reset OTP - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "LOGIN_OTP",
      smsParams: [otp],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

export async function sendPasswordUpdated({
  email,
  phoneNumber,
  name,
  shouldLog = true,
  sendBoth = true,
}) {
  const emailData = {
    name,
  };

  if (sendBoth) {
    return await sendEmailAndSMS({
      email,
      phoneNumber,
      emailTemplate: "password.updated.ejs",
      emailData,
      emailSubject:
        "Password Updated Successfully - Admission Management System",
      smsTemplate: "LOGIN_OTP",
      // smsParams: [otp],
      shouldLog,
    });
  } else if (email) {
    return await sendEmail({
      email,
      emailTemplate: "password.updated.ejs",
      emailData,
      emailSubject:
        "Password Updated Successfully - Admission Management System",
      shouldLog,
    });
  } else if (phoneNumber) {
    return await sendOnlySMS({
      phoneNumber,
      smsTemplate: "LOGIN_OTP",
      // smsParams: [otp],
      shouldLog,
    });
  }

  return { email: { success: false }, sms: { success: false } };
}

export default {
  sendEmail,
  sendOnlySMS,
  sendEmailAndSMS,
  sendTransactionCreated,
  sendPaymentReceived,
  sendLoginOTP,
  sendAccountCreated,
  sendAdmissionSubmitted,
  sendAdmissionConfirmed,
  sendEnquiryReceived,
  sendPasswordResetOTP,
  sendPasswordUpdated,
};
