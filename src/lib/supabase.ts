import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for server-side operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Database types based on client's schema
export interface Document {
  id: string;
  user_id: string;
  type: string;
  storage_path: string;
  meta_json: DocumentMeta;
  created_at: string;
}

export interface DocumentMeta {
  job_id?: string;
  status?: 'pending' | 'processing' | 'complete' | 'error';
  ocr_ratio?: number; // Ratio of OCR'd text to total content
  pages?: number;
  errors?: string[];
  original_filename?: string;
}

export interface Job {
  id: string;
  user_id: string;
  kind: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  input_json: JobInput;
  result_json: JobResult;
  error_json: JobError;
  created_at: string;
  updated_at: string;
}

export interface JobInput {
  document_id?: string;
  storage_path?: string;
  original_filename?: string;
  options?: {
    language?: string;
    ocr_engine?: 'pdf-parse' | 'tesseract';
    quality?: 'fast' | 'balanced' | 'high';
  };
}

export interface JobResult {
  extracted_text?: string;
  result_storage_path?: string;
  result_url?: string;
  ocr_ratio?: number;
  pages_processed?: number;
  processing_time_ms?: number;
  method_used?: 'pdf-parse' | 'tesseract';
}

export interface JobError {
  message?: string;
  code?: string;
  stage?: 'upload' | 'processing' | 'ocr' | 'storage';
  details?: any;
}
