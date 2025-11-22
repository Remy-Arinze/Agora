import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Support both MAIL_* and SMTP_* environment variable names
    const host = this.configService.get<string>('MAIL_HOST') || this.configService.get<string>('SMTP_HOST');
    // Parse port as number, default to 587 for standard SMTP, but Mailtrap uses 2525
    const portRaw = this.configService.get<string>('MAIL_PORT') || this.configService.get<string>('SMTP_PORT');
    const port = portRaw ? parseInt(portRaw, 10) : 587;
    const user = this.configService.get<string>('MAIL_USER') || this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('MAIL_PASSWORD') || this.configService.get<string>('SMTP_PASSWORD');
    // Mailtrap uses secure: false, so default to false if not specified
    const secureRaw = this.configService.get<string>('MAIL_SECURE') || this.configService.get<string>('SMTP_SECURE');
    const secure = secureRaw === 'true';
    
    // Log configuration (without sensitive data)
    this.logger.log(`Initializing email service with host: ${host}, port: ${port}`);
    
    if (!host || !user || !password) {
      this.logger.warn('Email service configuration incomplete. Some environment variables may be missing.');
      this.logger.warn(`Host: ${host ? '✓' : '✗'}, User: ${user ? '✓' : '✗'}, Password: ${password ? '✓' : '✗'}`);
    }
    
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure, // true for 465, false for other ports (Mailtrap uses false)
      auth: {
        user,
        pass: password,
      },
    });
    
    // Verify connection on startup
    this.verifyConnection().catch((error) => {
      this.logger.error('Initial SMTP connection verification failed:', error);
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string,
    role: string,
    publicId?: string
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const fromEmail = this.configService.get<string>('MAIL_FROM') || 
                      this.configService.get<string>('SMTP_FROM') || 
                      this.configService.get<string>('MAIL_USER') || 
                      this.configService.get<string>('SMTP_USER');
    
    if (!fromEmail) {
      this.logger.error('No FROM email address configured. Check MAIL_FROM or SMTP_FROM environment variable.');
      throw new Error('Email configuration error: No FROM address');
    }
    
    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Set Your Password - Agora Education Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Set Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Agora Education Platform</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${name}!</h2>
            <p>Your account has been created on the Agora Education Platform as a <strong>${role}</strong>.</p>
            ${publicId ? `
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-weight: bold;">Your Public ID: <code style="background-color: white; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${publicId}</code></p>
              <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 14px;">Use this Public ID along with your password to log in to your account.</p>
            </div>
            ` : ''}
            <p>To get started, please set your password by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Set Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> This link will expire in 24 hours. If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Agora Education Platform. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      this.logger.log(`Attempting to send password reset email to ${email} from ${fromEmail}`);
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to ${email}. MessageId: ${result.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      this.logger.error(`Error details: ${error.message}`);
      if (error.response) {
        this.logger.error(`SMTP Response: ${error.response}`);
      }
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async sendPasswordResetConfirmationEmail(
    email: string,
    name: string,
    publicId?: string
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('MAIL_FROM') || 
                      this.configService.get<string>('SMTP_FROM') || 
                      this.configService.get<string>('MAIL_USER') || 
                      this.configService.get<string>('SMTP_USER');
    
    if (!fromEmail) {
      this.logger.error('No FROM email address configured. Check MAIL_FROM or SMTP_FROM environment variable.');
      throw new Error('Email configuration error: No FROM address');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/auth/login`;

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Password Successfully Changed - Agora Education Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Agora Education Platform</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Successfully Changed</h2>
            <p>Hello ${name},</p>
            <p>Your password has been successfully changed on <strong>${new Date().toLocaleString()}</strong>.</p>
            ${publicId ? `
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-weight: bold;">Your Public ID: <code style="background-color: white; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${publicId}</code></p>
              <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 14px;">Use this Public ID along with your password to log in.</p>
            </div>
            ` : ''}
            <p>You can now log in to your account using your ${publicId ? 'Public ID or ' : ''}email and your new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Log In</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Security Notice:</strong> If you did not change your password, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Agora Education Platform. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      this.logger.log(`Attempting to send password reset confirmation email to ${email} from ${fromEmail}`);
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset confirmation email sent successfully to ${email}. MessageId: ${result.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send confirmation email to ${email}:`, error);
      this.logger.error(`Error details: ${error.message}`);
      if (error.response) {
        this.logger.error(`SMTP Response: ${error.response}`);
      }
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async sendRoleChangeEmail(
    email: string,
    name: string,
    oldRole: string,
    newRole: string,
    publicId?: string,
    schoolName?: string
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('MAIL_FROM') || 
                      this.configService.get<string>('SMTP_FROM') || 
                      this.configService.get<string>('MAIL_USER') || 
                      this.configService.get<string>('SMTP_USER');
    
    if (!fromEmail) {
      this.logger.error('No FROM email address configured. Check MAIL_FROM or SMTP_FROM environment variable.');
      throw new Error('Email configuration error: No FROM address');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/auth/login`;

    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: `Role Change Notification - ${newRole} - Agora Education Platform`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Role Change Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #8b5cf6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Agora Education Platform</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Role Change Notification</h2>
            <p>Hello ${name},</p>
            ${schoolName ? `<p>Your role at <strong>${schoolName}</strong> has been updated.</p>` : '<p>Your role has been updated.</p>'}
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">Previous Role: ${oldRole}</p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-weight: bold;">New Role: <span style="color: #059669;">${newRole}</span></p>
            </div>
            ${publicId ? `
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #1e40af; font-weight: bold;">Your Public ID: <code style="background-color: white; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${publicId}</code></p>
              <p style="margin: 10px 0 0 0; color: #1e40af; font-size: 14px;">Use this Public ID and your password to log in to your account.</p>
            </div>
            ` : ''}
            <p>You can now access your account with your new role permissions. Please log in using your ${publicId ? 'Public ID and password' : 'email and password'} to see the updated dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Log In</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              <strong>Note:</strong> If you have any questions about this role change, please contact your school administrator.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} Agora Education Platform. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    try {
      this.logger.log(`Attempting to send role change email to ${email} from ${fromEmail}`);
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Role change email sent successfully to ${email}. MessageId: ${result.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send role change email to ${email}:`, error);
      this.logger.error(`Error details: ${error.message}`);
      if (error.response) {
        this.logger.error(`SMTP Response: ${error.response}`);
      }
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}

