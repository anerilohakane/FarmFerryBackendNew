import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, partnershipType, message } = body;

        // Basic validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { success: false, message: 'Name, email, and message are required.' },
                { status: 400 }
            );
        }

        console.log('Received contact inquiry:', body);

        // Check for email configuration
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        const recipientEmail = 'info@farmferry.in';

        if (!emailUser || !emailPass) {
            console.warn('⚠️ EMAIL_USER or EMAIL_PASS not set in environment variables.');
            console.warn('Logging inquiry to console instead of sending email.');
            // For now, return success to simulate functionality for the user interface
            return NextResponse.json({
                success: true,
                message: 'Inquiry received (Email not sent: missing credentials in backend .env)'
            });
        }

        // Configure Nodemailer transporter
        // Using Gmail as an example, but could be any SMTP service
        const transporter = nodemailer.createTransport({
            service: 'gmail', // or host: 'smtp.example.com',
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });

        const mailOptions = {
            from: `"${name}" <${email}>`, // sender address (might differ based on SMTP rules)
            to: recipientEmail,
            subject: `New Inquiry from ${name} - ${partnershipType || 'Contact Form'}`,
            text: `
                Name: ${name}
                Email: ${email}
                Phone: ${phone || 'N/A'}
                Partnership Type: ${partnershipType || 'General Inquiry'}
                
                Message:
                ${message}
            `,
            html: `
                <h3>New Inquiry Received</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
                <p><strong>Partnership Type:</strong> ${partnershipType || 'General Inquiry'}</p>
                <hr />
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true, message: 'Inquiry sent successfully' });

    } catch (error) {
        console.error('Error in POST /api/v1/contact:', error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
