import { useState, useEffect } from "react"
import { supabase } from "@/services/SupabaseService"
import { useAuth } from "@/context/AuthContext"

export interface DashboardStats {
  todayVisits: number;
  totalVisitHours: number;
  thisWeekVisits: number;
  totalVisits: number;
  averageVisitDuration: number;
  lastVisitDate: string | null;
  loading: boolean;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    totalVisitHours: 0,
    thisWeekVisits: 0,
    totalVisits: 0,
    averageVisitDuration: 0,
    lastVisitDate: null,
    loading: true,
  })

  const { authEmail } = useAuth()

  // Get today's start and end times
  const getTodayRange = () => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    }
  }

  // Get this week's start time (Monday)
  const getThisWeekStart = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Handle Sunday as 0
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    return monday.toISOString()
  }

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      if (!authEmail) return

      setStats(prev => ({ ...prev, loading: true }))

      // Get current user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User not found:', userError)
        return
      }

      const userId = user.id
      const { start: todayStart, end: todayEnd } = getTodayRange()
      const thisWeekStart = getThisWeekStart()

      // Fetch all visit statistics in parallel
      const [
        todayVisitsResult,
        allVisitsResult,
        thisWeekVisitsResult,
        recentVisitResult
      ] = await Promise.all([
        // Today's visits
        supabase
          .from('visits')
          .select('id, duration_minutes')
          .eq('user_id', userId)
          .gte('check_in_time', todayStart)
          .lt('check_in_time', todayEnd),

        // All visits for total time and average calculation
        supabase
          .from('visits')
          .select('duration_minutes')
          .eq('user_id', userId)
          .not('duration_minutes', 'is', null),

        // This week's visits
        supabase
          .from('visits')
          .select('id')
          .eq('user_id', userId)
          .gte('check_in_time', thisWeekStart),

        // Most recent visit
        supabase
          .from('visits')
          .select('check_in_time, check_out_time, account:accounts(account_name)')
          .eq('user_id', userId)
          .order('check_in_time', { ascending: false })
          .limit(1)
      ])

      // Process results
      const todayCount = todayVisitsResult.data?.length || 0
      const allVisits = allVisitsResult.data || []
      const totalHours = allVisits.reduce((sum, visit) => 
        sum + (visit.duration_minutes || 0), 0) / 60
      const thisWeekCount = thisWeekVisitsResult.data?.length || 0
      const totalCount = allVisits.length
      const averageDuration = totalCount > 0 
        ? Math.round((totalHours * 60) / totalCount) // Average in minutes
        : 0
      
      let lastVisit = null
      if (recentVisitResult.data?.[0]) {
        const visit = recentVisitResult.data[0]
        const visitDate = new Date(visit.check_in_time)
        const accountName = (visit.account as any)?.account_name || 'Unknown Account'
        
        if (visit.check_out_time) {
          lastVisit = `${accountName} on ${visitDate.toLocaleDateString()}`
        } else {
          lastVisit = `Currently at ${accountName}`
        }
      }

      setStats({
        todayVisits: todayCount,
        totalVisitHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
        thisWeekVisits: thisWeekCount,
        totalVisits: totalCount,
        averageVisitDuration: averageDuration,
        lastVisitDate: lastVisit,
        loading: false,
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  const refresh = () => {
    fetchDashboardStats()
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [authEmail])

  return { stats, refresh }
}