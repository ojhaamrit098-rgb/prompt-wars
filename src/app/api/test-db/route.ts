import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Perform a read-only query against the 'jobs' table
    const { data, error } = await supabase.from('jobs').select('id').limit(1)

    if (error) {
      console.error('Supabase query error:', error.message)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Supabase',
      rowCount: data ? data.length : 0
    })
  } catch (err: any) {
    console.error('Unexpected error:', err.message)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
