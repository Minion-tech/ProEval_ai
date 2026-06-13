from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List
from app.core.config import settings

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
    TEMPLATE_FOLDER=None,
)

class EmailService:
    @staticmethod
    async def send_otp_email(email: EmailStr, otp_code: str) -> None:
        """
        Send OTP verification email to user.
        """
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>ProEval AI - Email Verification</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .otp-code {{
                    background: #fff;
                    border: 2px solid #667eea;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    font-size: 32px;
                    font-weight: bold;
                    color: #667eea;
                    letter-spacing: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                }}
                .warning {{
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ProEval AI</h1>
                <h2>Email Verification</h2>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Welcome to ProEval AI! To complete your registration, please use the verification code below:</p>

                <div class="otp-code">{otp_code}</div>

                <div class="warning">
                    <strong>Important:</strong> This code will expire in 5 minutes for security reasons.
                </div>

                <p>If you didn't request this verification, please ignore this email.</p>

                <p>Best regards,<br>The ProEval AI Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2026 ProEval AI. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        message = MessageSchema(
            subject="Your ProEval AI Verification Code",
            recipients=[email],
            body=html_content,
            subtype="html"
        )

        fm = FastMail(conf)
        await fm.send_message(message)

    @staticmethod
    async def send_welcome_email(email: EmailStr, name: str) -> None:
        """
        Send welcome email after successful registration.
        """
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Welcome to ProEval AI</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .welcome-message {{
                    font-size: 18px;
                    margin: 20px 0;
                }}
                .cta-button {{
                    display: inline-block;
                    background: #667eea;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎉 Welcome to ProEval AI!</h1>
            </div>
            <div class="content">
                <p class="welcome-message">Hi {name},</p>

                <p>Welcome to ProEval AI! Your account has been successfully created and verified.</p>

                <p>You can now:</p>
                <ul>
                    <li>Submit your project proposals</li>
                    <li>Track your project progress</li>
                    <li>Receive AI-powered feedback</li>
                    <li>Collaborate with your team</li>
                </ul>

                <a href="http://localhost:3000/login" class="cta-button">Get Started</a>

                <p>If you have any questions, feel free to reach out to the platform administration.</p>

                <p>Happy evaluating!<br>The ProEval AI Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; 2026 ProEval AI. All rights reserved.</p>
            </div>
        </body>
        </html>
        """

        message = MessageSchema(
            subject="Welcome to ProEval AI!",
            recipients=[email],
            body=html_content,
            subtype="html"
        )

        fm = FastMail(conf)
        await fm.send_message(message)