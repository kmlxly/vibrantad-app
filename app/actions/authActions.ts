'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from './emailActions'
import { headers } from 'next/headers'

export async function requestPasswordReset(email: string) {
  if (!email) {
    return { error: 'Sila masukkan alamat emel anda.' }
  }

  try {
    // Get the dynamic site URL for the reset link
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    // 1. Generate recovery link using Supabase Admin
    // This won't send an email, just gives us the link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/update-password`,
      }
    })

    if (error) {
      console.error('Error generating recovery link:', error)
      // If user not found, we don't want to leak that for security
      // but for internal staff app, maybe it's fine. 
      // Better to show a generic success message.
      return { success: true, message: 'Jika emel anda berdaftar, pautan reset telah dihantar.' }
    }

    const recoveryLink = data.properties.action_link

    // 2. Send custom HTML email using our nodemailer setup
    const result = await sendEmail({
      to: email,
      subject: '🔐 Reset Kata Laluan: Vibrant Staff App',
      text: `Anda telah meminta untuk menetapkan semula kata laluan anda. Sila klik pautan ini untuk meneruskan: ${recoveryLink}`,
      html: `
                <div style="background-color: #27272a; padding: 40px 20px; font-family: sans-serif;">
                    <div style="background-color: #ffffff; border: 4px solid #000000; border-radius: 20px; max-width: 550px; margin: 0 auto; padding: 40px; box-sizing: border-box; color: #000000;">
                        
                        <!-- Header with Logo -->
                        <div style="display: inline-block; background-color: #ffff00; border: 3px solid #000000; padding: 10px 20px; margin-bottom: 30px;">
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <img src="${siteUrl}/icon.png" alt="Logo" width="30" height="30" style="display: block; margin-right: 15px;">
                                    </td>
                                    <td>
                                        <span style="font-size: 20px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: -0.5px;">VIBRANT STAFF</span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; font-style: italic; margin: 0 0 25px 0; line-height: 1;">RESET KATA LALUAN</h1>
                        
                        <p style="font-size: 16px; font-weight: 800; line-height: 1.5; margin: 0 0 30px 0;">
                            Anda telah meminta untuk menetapkan semula kata laluan akaun Vibrant Staff App anda.
                        </p>

                        <div style="background-color: #f4f4f5; border-left: 8px solid #f97316; padding: 25px; margin-bottom: 40px;">
                            <p style="margin: 0; font-size: 15px; font-weight: 700; line-height: 1.6; color: #18181b;">
                                Pautan ini akan tamat tempoh dalam masa yang singkat. Jika anda tidak melakukan permintaan ini, sila abaikan emel ini.
                            </p>
                        </div>

                        <div style="margin-bottom: 40px;">
                            <a href="${recoveryLink}" style="display: inline-block; background-color: #ff6b6b; color: #ffffff; padding: 18px 35px; text-decoration: none; font-size: 16px; font-weight: 900; text-transform: uppercase; border: 3px solid #000000; box-shadow: 6px 6px 0px 0px #000000;">
                                Tetapkan Kata Laluan Baru
                            </a>
                        </div>

                        <p style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #a1a1aa; margin: 0;">
                            © 2026 VIBRANT TACTIC SDN BHD
                        </p>
                    </div>
                </div>
            `
    })

    if (!result.success) {
      return { error: 'Gagal menghantar emel. Sila cuba lagi nanti.' }
    }

    return { success: true, message: 'Pautan reset telah dihantar ke emel anda. Sila semak peti masuk (inbox) atau folder spam.' }

  } catch (err: any) {
    console.error('Unexpected error in requestPasswordReset:', err)
    return { error: 'Ralat tidak dijangka berlaku.' }
  }
}
