'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addHike(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('hikes').insert({
    user_id: user.id,
    mountain: formData.get('mountain') as string,
    trail: formData.get('trail') as string || null,
    date: formData.get('date') as string,
    distance_km: formData.get('distance_km') ? Number(formData.get('distance_km')) : null,
    elevation_m: formData.get('elevation_m') ? Number(formData.get('elevation_m')) : null,
    duration_min: formData.get('duration_min') ? Number(formData.get('duration_min')) : null,
    memo: formData.get('memo') as string || null,
  })

  revalidatePath('/dashboard/hikes')
  revalidatePath('/dashboard')
}

export async function deleteHike(hikeId: string) {
  const supabase = await createClient()
  await supabase.from('hikes').delete().eq('id', hikeId)
  revalidatePath('/dashboard/hikes')
  revalidatePath('/dashboard')
}
