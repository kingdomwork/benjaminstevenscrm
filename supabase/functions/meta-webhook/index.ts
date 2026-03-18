import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') || '';
const META_ACCESS_TOKEN = Deno.env.get('META_ACCESS_TOKEN') || '';

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Handle GET request for Meta Webhook Verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 2. Handle POST request for Meta Webhook Events (Lead Gen)
  if (req.method === 'POST') {
    try {
      const body = await req.json();

      if (body.object === 'page') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadData = change.value;
              
              let leadDetails: any = {};
              
              // Fetch lead details from Meta Graph API
              if (leadData.leadgen_id && META_ACCESS_TOKEN) {
                const response = await fetch(`https://graph.facebook.com/v25.0/${leadData.leadgen_id}?access_token=${META_ACCESS_TOKEN}`);
                const data = await response.json();
                
                if (data.field_data) {
                  data.field_data.forEach((field: any) => {
                    leadDetails[field.name] = field.values[0];
                  });
                }
              }

              // Insert the lead into the Supabase 'leads' table
              const { error } = await supabase
                .from('leads')
                .insert([
                  {
                    leadgen_id: leadData.leadgen_id || '',
                    first_name: leadDetails.first_name || '',
                    last_name: leadDetails.last_name || '',
                    email: leadDetails.email || '',
                    phone: leadDetails.phone || '',
                    ad_set_name: leadDetails.ad_set_name || leadData.ad_set_name || '',
                    campaign_name: leadDetails.campaign_name || leadData.campaign_name || '',
                    qualifying_answer: leadDetails.qualifying_answer || leadDetails['Do you currently have a documented, court-ready compliance trail for all your rental properties to meet the new Section 8 mandatory possession requirements?'] || '',
                    status: 'pending'
                  }
                ]);

              if (error) {
                console.error('Supabase insert error:', error);
              } else {
                console.log('Lead successfully inserted into Supabase');
              }
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Error processing webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
})
