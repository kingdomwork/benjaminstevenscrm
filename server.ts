import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const upload = multer({ storage: multer.memoryStorage() });

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const META_PIXEL_ID = process.env.META_PIXEL_ID || '';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Gemini client
let ai: GoogleGenAI | null = null;
try {
  if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
} catch (e) {
  console.warn('Failed to initialize Gemini client:', e);
}

// Authentication Middleware
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    (req as any).user = user;
    next();
  });
};

// --- API Routes ---

// 1. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (password === LOGIN_PASSWORD) {
    const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// 2. Auth Check
app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ authenticated: true });
});

// 3. Auth Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// 4. Meta Webhook Verification
app.get('/api/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 5. Meta Webhook Receive Lead
app.post('/api/webhook/meta', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadData = change.value;
            
            // In a real app, you would fetch the lead details from Meta Graph API using the leadgen_id
            // For this example, we'll assume the webhook payload contains the data or we mock it if missing
            // Meta Lead Gen webhook only sends leadgen_id, you must fetch the actual data.
            
            let leadDetails: any = {};
            
            if (leadData.leadgen_id && META_ACCESS_TOKEN) {
              const response = await fetch(`https://graph.facebook.com/v25.0/${leadData.leadgen_id}?access_token=${META_ACCESS_TOKEN}`);
              const data = await response.json();
              
              if (data.field_data) {
                data.field_data.forEach((field: any) => {
                  leadDetails[field.name] = field.values[0];
                });
              }
            } else {
              // Fallback/Mock for testing if no token or id
              leadDetails = {
                full_name: 'Test Lead',
                first_name: 'Test',
                last_name: 'Lead',
                email: 'test@example.com',
                phone: '1234567890',
                ad_set_name: leadData.ad_set_name || 'Test Ad Set',
                campaign_name: leadData.campaign_name || 'Test Campaign',
                qualifying_answer: 'Yes'
              };
            }

            // Extract names safely
            const fullName = leadDetails.full_name || `${leadDetails.first_name || ''} ${leadDetails.last_name || ''}`.trim();
            const firstName = leadDetails.first_name || (fullName ? fullName.split(' ')[0] : '');
            const lastName = leadDetails.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

            // Insert into Supabase
            const { error } = await supabase
              .from('leads')
              .insert([
                {
                  leadgen_id: leadData.leadgen_id || '',
                  meta_created_time: leadData.created_time || null,
                  ad_id: leadData.ad_id || '',
                  ad_name: leadData.ad_name || '',
                  adset_id: leadData.adset_id || '',
                  ad_set_name: leadDetails.ad_set_name || leadData.adset_name || leadData.ad_set_name || '',
                  campaign_id: leadData.campaign_id || '',
                  campaign_name: leadDetails.campaign_name || leadData.campaign_name || '',
                  form_id: leadData.form_id || '',
                  form_name: leadData.form_name || '',
                  is_organic: leadData.is_organic === 'true' || leadData.is_organic === true,
                  platform: leadData.platform || '',
                  first_name: firstName,
                  last_name: lastName,
                  full_name: fullName,
                  email: leadDetails.email || '',
                  phone: leadDetails.phone || '',
                  qualifying_answer: leadDetails.qualifying_answer || leadDetails['do_you_currently_have_a_documented,_court-ready_compliance_trail_for_all_your_rental_properties_to_meet_the_new_section_8_mandatory_possession_requirements?'] || leadDetails['Do you currently have a documented, court-ready compliance trail for all your rental properties to meet the new Section 8 mandatory possession requirements?'] || '',
                  meta_lead_status: leadDetails.lead_status || '',
                  status: 'pending'
                }
              ]);

            if (error) console.error('Supabase insert error:', error);
          }
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// 6. Get Leads
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Update Lead Status
app.put('/api/leads/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData: any = { status };
    if (status === 'qualified') {
      updateData.qualified_at = new Date().toISOString();
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If qualified, fire Meta CAPI
    if (status === 'qualified' && META_PIXEL_ID && META_ACCESS_TOKEN) {
      // Hash email and phone according to Meta's requirements (SHA256, lowercase, trimmed)
      const hashedEmail = lead.email ? crypto.createHash('sha256').update(lead.email.trim().toLowerCase()).digest('hex') : undefined;
      
      // Phone numbers should contain only digits and country code.
      const cleanPhone = lead.phone ? lead.phone.replace(/[^\d]/g, '') : '';
      const hashedPhone = cleanPhone ? crypto.createHash('sha256').update(cleanPhone).digest('hex') : undefined;

      const userData: any = {};
      if (hashedEmail) userData.em = [hashedEmail];
      if (hashedPhone) userData.ph = [hashedPhone];
      if (lead.leadgen_id) userData.lead_id = lead.leadgen_id;

      const capiPayload = {
        data: [
          {
            event_name: 'Qualified',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'system_generated',
            user_data: userData,
            custom_data: {
              event_source: 'crm',
              lead_event_source: 'Benjamin Stevens CRM'
            }
          }
        ]
      };

      // Send to Meta CAPI v25.0
      fetch(`https://graph.facebook.com/v25.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(capiPayload)
      })
      .then(res => res.json())
      .then(data => console.log('Meta CAPI Response:', data))
      .catch(err => console.error('Meta CAPI Error:', err));
    }

    res.json(lead);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Generate Report via Gemini
app.post('/api/report', authenticateToken, async (req, res) => {
  try {
    // Get leads from past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    const leadsDataString = JSON.stringify(leads, null, 2);

    const prompt = `You are a professional report generator. Create a clean, well-formatted lead report table with the following columns: Name, Email, Phone, Ad Set, Date, Qualifying Answer, Status. The qualifying question was: 'Do you currently have a documented, court-ready compliance trail for all your rental properties to meet the new Section 8 mandatory possession requirements?' Format the Yes/No answers clearly. Make the report easy to read for a non-technical lettings team. Title the report 'Benjamin Stevens — Lettings Leads Report' with the date range at the top.

Here is the JSON data for the leads:
${leadsDataString}

Output ONLY a valid JSON array of objects representing the rows of the report. The keys should be: "Name", "Email", "Phone", "Ad Set", "Date", "Qualifying Answer", "Status". Do not include markdown codeblocks like \`\`\`json. Just the raw JSON array.`;

    if (!ai) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
    });

    let jsonContent = response.text || '[]';
    jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let reportData = [];
    try {
      reportData = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      // Fallback to raw data if Gemini fails
      reportData = (leads || []).map(l => ({
        Name: `${l.first_name} ${l.last_name}`,
        Email: l.email,
        Phone: l.phone,
        "Ad Set": l.ad_set_name,
        Date: new Date(l.created_at).toLocaleDateString(),
        "Qualifying Answer": l.qualifying_answer,
        Status: l.status
      }));
    }

    // Generate PDF using jsPDF
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Benjamin Stevens — Lettings Leads Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date Range: ${sevenDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}`, 14, 30);

    const tableColumn = ["Name", "Email", "Phone", "Ad Set", "Date", "Qualifying Answer", "Status"];
    const tableRows = reportData.map((row: any) => [
      row.Name || '',
      row.Email || '',
      row.Phone || '',
      row["Ad Set"] || '',
      row.Date || '',
      row["Qualifying Answer"] || '',
      row.Status || ''
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=lead-report.pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 9. Export Leads to CSV
app.get('/api/leads/export', authenticateToken, async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!leads || leads.length === 0) {
      return res.status(404).send('No leads found');
    }

    const headers = ['Leadgen ID', 'Created Time', 'Ad ID', 'Ad Name', 'Adset ID', 'Ad Set Name', 'Campaign ID', 'Campaign Name', 'Form ID', 'Form Name', 'Is Organic', 'Platform', 'Full Name', 'Email', 'Phone', 'Qualifying Answer', 'Meta Lead Status', 'CRM Status'];
    const csvRows = [headers.join(',')];

    for (const lead of leads) {
      const row = [
        `"${lead.leadgen_id || ''}"`,
        `"${lead.meta_created_time || new Date(lead.created_at).toISOString()}"`,
        `"${lead.ad_id || ''}"`,
        `"${lead.ad_name || ''}"`,
        `"${lead.adset_id || ''}"`,
        `"${lead.ad_set_name || ''}"`,
        `"${lead.campaign_id || ''}"`,
        `"${lead.campaign_name || ''}"`,
        `"${lead.form_id || ''}"`,
        `"${lead.form_name || ''}"`,
        `"${lead.is_organic || 'false'}"`,
        `"${lead.platform || ''}"`,
        `"${lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim()}"`,
        `"${lead.email || ''}"`,
        `"${lead.phone || ''}"`,
        `"${(lead.qualifying_answer || '').replace(/"/g, '""')}"`,
        `"${lead.meta_lead_status || ''}"`,
        `"${lead.status || ''}"`
      ];
      csvRows.push(row.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.send(csvRows.join('\n'));
  } catch (error: any) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Upload CSV and Parse with Gemini
app.post('/api/leads/upload', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = req.file.buffer.toString('utf-8');

    if (!ai) {
      throw new Error('Gemini API key is not configured.');
    }

    const prompt = `You are an expert data parser. I am providing you with the raw text of a CSV file containing lead information.
Your task is to extract the leads and structure them into a JSON array.

Map the columns to these exact keys for each lead object:
- leadgen_id (string, map from 'id')
- meta_created_time (string, map from 'created_time')
- ad_id (string)
- ad_name (string)
- adset_id (string)
- ad_set_name (string, map from 'adset_name')
- campaign_id (string)
- campaign_name (string)
- form_id (string)
- form_name (string)
- is_organic (string)
- platform (string)
- qualifying_answer (string, map from 'do_you_currently_have_a_documented,_court-ready_compliance_trail_for_all_your_rental_properties_to_meet_the_new_section_8_mandatory_possession_requirements?' or similar)
- email (string)
- full_name (string)
- phone (string)
- meta_lead_status (string, map from 'lead_status')

If a field is missing or unclear, leave it as an empty string. Try to split full names into first_name and last_name if only a "Name" column exists.

Here is the CSV content:
${csvContent}

Output ONLY a valid JSON array of objects. Do not include markdown formatting like \`\`\`json.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
    });

    let jsonContent = response.text || '[]';
    jsonContent = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedLeads = [];
    try {
      parsedLeads = JSON.parse(jsonContent);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      throw new Error('Failed to parse leads from CSV');
    }

    if (!Array.isArray(parsedLeads) || parsedLeads.length === 0) {
      return res.status(400).json({ error: 'No valid leads found in the CSV' });
    }

    // Add default status and prepare for insert
    const leadsToInsert = parsedLeads.map((lead: any) => {
      const fullName = lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
      const firstName = lead.first_name || (fullName ? fullName.split(' ')[0] : '');
      const lastName = lead.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '');

      return {
        leadgen_id: lead.leadgen_id || '',
        meta_created_time: lead.meta_created_time || null,
        ad_id: lead.ad_id || '',
        ad_name: lead.ad_name || '',
        adset_id: lead.adset_id || '',
        ad_set_name: lead.ad_set_name || 'Manual CSV Upload',
        campaign_id: lead.campaign_id || '',
        campaign_name: lead.campaign_name || 'Manual CSV Upload',
        form_id: lead.form_id || '',
        form_name: lead.form_name || '',
        is_organic: lead.is_organic === 'true' || lead.is_organic === true,
        platform: lead.platform || '',
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: lead.email || '',
        phone: lead.phone || '',
        qualifying_answer: lead.qualifying_answer || '',
        meta_lead_status: lead.meta_lead_status || '',
        status: 'pending'
      };
    });

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (error) throw error;

    res.json({ success: true, count: leadsToInsert.length, leads: data });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
