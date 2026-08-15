/**
 * Storage Service — Works with both local filesystem and Vercel (Supabase)
 * For Vercel: uses Supabase for ALL data storage
 * For local: uses JSON files as fallback
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1';

// Lazy-load Supabase client
let supabaseClient = null;

async function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    try {
        const { getSupabase } = await import('./supabase.service.js');
        supabaseClient = getSupabase();
        return supabaseClient;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════
//  CONSENTS
// ═══════════════════════════════════════════════════════

export async function loadConsents() {
    // Always try Supabase first (works on both Vercel and local)
    const client = await getSupabaseClient();
    if (client) {
        try {
            const { data, error } = await client
                .from('consents')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                // Transform Supabase rows - merge top-level with data JSONB
                return data.map(row => {
                    const d = row.data || {};
                    return {
                        ...d,
                        consentId: row.consent_id || d.consentId,
                        doctorId: row.doctor_id || d.doctorId,
                        patientName: row.patient_name || d.patientName,
                        procedure: row.procedure || d.procedure,
                        status: row.status || d.status
                    };
                });
            }
        } catch (err) {
            console.warn('Supabase load failed, trying local:', err.message);
        }
    }

    // Fallback: local filesystem
    const DATA_PATH = path.join(__dirname, '../data/consents.json');
    try {
        const raw = await fs.readFile(DATA_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export async function saveConsents(consents) {
    // Always try Supabase first
    const client = await getSupabaseClient();
    if (client) {
        try {
            for (const consent of consents) {
                await client
                    .from('consents')
                    .upsert({
                        consent_id: consent.consentId,
                        doctor_id: consent.doctorId,
                        patient_name: consent.patientName,
                        procedure: consent.procedure,
                        status: consent.status,
                        emergency_mode: consent.emergencyMode || false,
                        data: consent,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'consent_id' });
            }
            console.log(`✅ Consents saved to Supabase`);
            return;
        } catch (err) {
            console.warn('Supabase save failed, trying local:', err.message);
        }
    }

    // Fallback: local filesystem
    const DATA_PATH = path.join(__dirname, '../data/consents.json');
    const DATA_DIR = path.dirname(DATA_PATH);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(consents, null, 2));
}

// ═══════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════

export async function loadUsers() {
    const client = await getSupabaseClient();
    if (client) {
        try {
            const { data, error } = await client.from('users').select('*');
            if (!error && data) {
                return data.map(row => row.data || row);
            }
        } catch {}
    }

    const USERS_PATH = path.join(__dirname, '../auth/users.json');
    try {
        const raw = await fs.readFile(USERS_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

export async function saveUsers(users) {
    const client = await getSupabaseClient();
    if (client) {
        try {
            for (const user of users) {
                await client
                    .from('users')
                    .upsert({
                        user_id: user.id,
                        data: user,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
            }
            return;
        } catch {}
    }

    const USERS_PATH = path.join(__dirname, '../auth/users.json');
    await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

// ═══════════════════════════════════════════════════════
//  DIRECTORIES & FILES (local only)
// ═══════════════════════════════════════════════════════

export async function ensureDirs() {
    if (isVercel) return; // Supabase handles storage

    const dirs = [
        path.join(__dirname, '../data'),
        path.join(__dirname, '../generated-consents'),
        path.join(__dirname, '../generated-pdfs')
    ];
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

export async function saveConsentHTML(consentId, html) {
    if (isVercel) return null;
    const CONSENT_DIR = path.join(__dirname, '../generated-consents');
    await fs.mkdir(CONSENT_DIR, { recursive: true });
    const filePath = path.join(CONSENT_DIR, `${consentId}.html`);
    await fs.writeFile(filePath, html);
    return filePath;
}

export async function savePDFLocally(consentId, pdfBuffer) {
    if (isVercel) return null;
    const pdfDir = path.join(__dirname, '../generated-pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    const filePath = path.join(pdfDir, `${consentId}.pdf`);
    await fs.writeFile(filePath, pdfBuffer);
    return filePath;
}
