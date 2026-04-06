import nodemailer from 'nodemailer'

export const createTransporter = () => {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT) || 465

    return nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        }
    })
}
