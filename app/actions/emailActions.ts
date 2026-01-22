'use server'

import { createTransporter } from '@/lib/mail'

interface EmailParams {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: EmailParams) {
  try {
    if (!process.env.SMTP_HOST) {
      console.error('SMTP Config Missing: SMTP_HOST is not set.')
      return { success: false, error: 'Konfigurasi SMTP (SMTP_HOST) tidak dijumpai dalam .env. Sila hubungi admin.' }
    }

    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from: {
        name: process.env.SMTP_FROM_NAME?.replace(/"/g, '') || 'Vibrant Staff System',
        address: process.env.SMTP_FROM as string
      },
      to,
      subject,
      text,
      html,
    })
    return { success: true, messageId: info.messageId }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Helper permohonan baru (dihantar kepada SEMUA admin)
export async function notifyAllAdmins(staffName: string, type: string, dates: string) {
  console.log(`Mencari admin untuk notifikasi permohonan dari: ${staffName}`)

  // Gunakan admin client untuk melepasi RLS (Bypass RLS)
  // Kerana user biasa mungkin tidak dibenarkan melihat profile Admin
  const { data: admins, error } = await supabaseAdmin
    .from('profiles')
    .select('email, role, full_name')
    .ilike('role', 'admin')

  if (error) {
    console.error('Error fetching admins for email:', error)
    return { success: false, error: error.message }
  }

  console.log(`Jumpa ${admins?.length || 0} akaun admin:`, admins?.map(a => a.email))

  if (!admins || admins.length === 0) {
    console.warn('Tiada admin dijumpai dengan alamat email dalam database.')
    return { success: false, error: 'Tiada admin' }
  }

  const results = await Promise.all(
    admins.map(admin => {
      if (admin.email) {
        console.log(`Menghantar email ke admin: ${admin.email}`)
        return notifyAdminNewRequest(admin.email, staffName, type, dates)
      }
      return null
    })
  )

  const successCount = results.filter(r => r?.success).length
  console.log(`Berjaya hantar ${successCount} email notifikasi kepada admin.`)
  return { success: true, count: successCount }
}

// Helper permohonan baru (template email admin)
export async function notifyAdminNewRequest(adminEmail: string, staffName: string, type: string, dates: string) {
  return await sendEmail({
    to: adminEmail,
    subject: `🚨 Permohonan Lokasi Baru: ${staffName}`,
    text: `Staff ${staffName} telah menghantar permohonan untuk bekerja secara ${type} pada tarikh ${dates}. Sila log masuk ke dashboard untuk tindakan lanjut.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 4px solid black; border-radius: 10px;">
        <h2 style="text-transform: uppercase; font-style: italic;">Permohonan Lokasi Baru</h2>
        <p>Staff <b>${staffName}</b> telah menghantar permohonan:</p>
        <div style="background: #f4f4f4; padding: 15px; border-left: 4px solid #fd8d14;">
          <p><b>Jenis:</b> ${type}</p>
          <p><b>Tarikh:</b> ${dates}</p>
        </div>
        <p>Sila log masuk ke dashboard untuk meluluskan atau menolak permohonan ini.</p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display: inline-block; background: black; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Buka Dashboard</a>
      </div>
    `
  })
}

// Helper status permohonan (dihantar kepada staff)
export async function notifyStaffStatusUpdate(staffEmail: string, type: string, status: string) {
  const isApproved = status === 'approved'
  const statusBM = isApproved ? 'DILULUSKAN' : 'DITOLAK'
  const color = isApproved ? '#4ade80' : '#f87171'

  return await sendEmail({
    to: staffEmail,
    subject: `📢 Status Permohonan Lokasi: ${statusBM}`,
    text: `Permohonan anda untuk bekerja secara ${type} telah ${statusBM}. Sila log masuk ke dashboard untuk maklumat lanjut.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 4px solid black; border-radius: 10px;">
        <h2 style="text-transform: uppercase; font-style: italic;">Kemasukan Status Permohonan</h2>
        <p>Permohonan anda untuk <b>${type}</b> telah:</p>
        <div style="background: ${color}; color: white; padding: 15px; text-align: center; font-weight: bold; font-size: 20px; text-transform: uppercase;">
          ${statusBM}
        </div>
        <p>Sila semak dashboard anda untuk rekod rasmi.</p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="display: inline-block; background: black; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Buka Dashboard</a>
      </div>
    `
  })
}
