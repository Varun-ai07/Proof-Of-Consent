/**
 * Supabase Service — Database and Storage for signed consents
 */
import { createClient } from '@supabase/supabase-js';

let supabase = null;

export function getSupabase() {
    // Read env vars lazily (after loadEnv() has run)
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
        return null;
    }
    if (!supabase) {
        supabase = createClient(url, key);
        console.log('✅ Supabase connected');
    }
    return supabase;
}

/**
 * Save signed consent to Supabase
 */
export async function saveSignedConsent({ consentId, doctorId, patientName, procedure, signedAt, pdfUrl, pdfPath, status }) {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await client
            .from('signed_consents')
            .upsert({
                consent_id: consentId,
                doctor_id: doctorId,
                patient_name: patientName,
                procedure: procedure,
                signed_at: signedAt || new Date().toISOString(),
                pdf_url: pdfUrl || null,
                pdf_path: pdfPath || null,
                status: status || 'signed',
                created_at: new Date().toISOString()
            }, { onConflict: 'consent_id' });

        if (error) throw error;
        console.log(`✅ Consent saved to Supabase: ${consentId}`);
        return { success: true, data };
    } catch (err) {
        console.error('❌ Supabase save error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Upload PDF to Supabase Storage
 */
export async function uploadConsentPDF(consentId, pdfBuffer) {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const filePath = `consents/${consentId}.pdf`;
        const { data, error } = await client.storage
            .from('consent-pdfs')
            .upload(filePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = client.storage
            .from('consent-pdfs')
            .getPublicUrl(filePath);

        console.log(`✅ PDF uploaded to Supabase: ${filePath}`);
        return { success: true, path: filePath, url: urlData.publicUrl };
    } catch (err) {
        console.error('❌ PDF upload error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get signed consents for a doctor
 */
export async function getDoctorConsents(doctorId) {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await client
            .from('signed_consents')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('signed_at', { ascending: false });

        if (error) throw error;
        return { success: true, consents: data };
    } catch (err) {
        console.error('❌ Supabase fetch error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get consent PDF URL
 */
export async function getConsentPDFUrl(consentId) {
    const client = getSupabase();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
        const { data, error } = await client
            .from('signed_consents')
            .select('pdf_url, pdf_path')
            .eq('consent_id', consentId)
            .single();

        if (error) throw error;
        return { success: true, ...data };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
