import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://qoeriziycarbbyvnyzdd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvZXJpeml5Y2FyYmJ5dm55emRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzYxNDAsImV4cCI6MjA5NDcxMjE0MH0.pCu_SUZnNvvxFNtpIV2argtYKasTA71OPYWFdZ-rgXw'

export const supabase = createClient(supabaseUrl, supabaseKey)