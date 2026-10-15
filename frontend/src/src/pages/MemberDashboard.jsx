import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import ForgotPinModal from '../components/ForgotPinModal'
import { getImageUrl } from '../utils/config'

export default function MemberDashboard() {
  const navigate = useNavigate()

  // State
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'explore' | 'profile' | 'idcard'
  const [allEvents, setAllEvents] = useState([])
  const [myRegistrations, setMyRegistrations] = useState([])
  const [myAttendance, setMyAttendance] = useState([])
  const [memberNumber, setMemberNumber] = useState('')
  const [customLogo, setCustomLogo] = useState('')
  const [showForgotPinModal, setShowForgotPinModal] = useState(false)
  const [membershipDuration, setMembershipDuration] = useState('')

  useEffect(() => {
    loadMemberData()
    const savedLogo = localStorage.getItem('customLogo')
    if (savedLogo) setCustomLogo(savedLogo)
  }, [])

  async function loadMemberData() {
    setLoading(true)
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || 'null')
      if (!localUser) {
        navigate('/login')
        return
      }

      // Fetch fresh member record from database
      let query = supabase.from('members').select('*')
      if (localUser.id) {
        query = query.eq('id', localUser.id)
      } else if (localUser.phone) {
        query = query.eq('phone_number', localUser.phone)
      } else {
        query = query.eq('email', localUser.email)
      }

      const { data: memberData, error: memberErr } = await query.limit(1).maybeSingle()
      if (memberErr || !memberData) {
        // Fallback to local session data if query fails
        setMember(localUser)
      } else {
        setMember(memberData)
        // Update local session
        localStorage.setItem('user', JSON.stringify({ ...localUser, ...memberData, role: 'member' }))
      }

      const currentMemberId = memberData?.id || localUser.id

      // Calculate Member Number based on creation order
      try {
        const { data: allMembers } = await supabase
          .from('members')
          .select('id, created_at')
          .order('created_at', { ascending: true })

        if (allMembers && currentMemberId) {
          const idx = allMembers.findIndex(m => m.id === currentMemberId)
          if (idx !== -1) {
            setMemberNumber(`ITLC${String(idx + 1).padStart(4, '0')}`)
          }
        }
      } catch (e) {
        console.warn('Member number calc error:', e)
      }

      // Calculate Membership duration
      if (memberData?.created_at) {
        const joinedDate = new Date(memberData.created_at)
        const now = new Date()
        const diffDays = Math.floor(Math.abs(now - joinedDate) / (1000 * 60 * 60 * 24))
        const years = Math.floor(diffDays / 365)
        const months = Math.floor((diffDays % 365) / 30)
        setMembershipDuration(years > 0 ? `${years} yr ${months} mo` : `${Math.max(1, months)} months`)
      }

      // Fetch member registrations & events
      if (currentMemberId) {
        const [regRes, attRes, eventsRes] = await Promise.all([
          supabase.from('event_registrations').select('*').eq('member_id', currentMemberId),
          supabase.from('event_attendance').select('*').eq('member_id', currentMemberId),
          supabase.from('events').select('*').order('date', { ascending: true })
        ])

        const regs = regRes.data || []
        const atts = attRes.data || []
        const eventsList = eventsRes.data || []

        setAllEvents(eventsList)
        setMyRegistrations(regs)
        setMyAttendance(atts)
      }
    } catch (err) {
      console.error('Error loading member dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="size-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your member dashboard...</p>
        </div>
      </div>
    )
  }

  const registeredEventIds = new Set(myRegistrations.map(r => r.event_id))
  const attendedEventIds = new Set(myAttendance.map(a => a.event_id))

  // Registered events with event details
  const registeredEventsWithDetails = myRegistrations.map(reg => {
    const eventDetails = allEvents.find(e => e.id === reg.event_id)
    const hasAttended = attendedEventIds.has(reg.event_id)
    return {
      ...reg,
      event: eventDetails || { title: 'ITLC Event', date: 'Upcoming', location: 'Kerala' },
      isAttended: hasAttended
    }
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <img
                src={customLogo || '/itlc-logo.svg'}
                alt="ITLC Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                IT Leaders Community
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kerala Chapter • Member Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/update-profile')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => navigate('/member/id-card')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>My ID Card</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Member Profile Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-primary p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative size-24 sm:size-28 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/40 shadow-inner flex-shrink-0">
              {member?.profile_image ? (
                <img
                  src={member.profile_image}
                  alt={member.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-white">
                  {member?.full_name?.charAt(0) || 'M'}
                </div>
              )}
            </div>

            {/* Member Details */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
                  {member?.membership_tier || 'Member'}
                </span>
                {memberNumber && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/10 text-white border border-white/20">
                    {memberNumber}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {member?.salutation ? `${member.salutation} ` : ''}{member?.full_name}
              </h2>
              <p className="text-blue-100 text-sm font-medium mt-0.5">
                {member?.designation || 'IT Leader'}{member?.company ? ` • ${member.company}` : ''}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-xs text-blue-100/90">
                {member?.itlc_chapter_name && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_city</span>
                    {member.itlc_chapter_name}
                  </span>
                )}
                {member?.location && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">pin_drop</span>
                    {member.location}
                  </span>
                )}
                {member?.phone_number && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">phone</span>
                    {member.phone_number}
                  </span>
                )}
                {member?.email && (
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    {member.email}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action buttons */}
            <div className="flex md:flex-col gap-2 w-full md:w-auto">
              <button
                onClick={() => navigate('/update-profile')}
                className="flex-1 md:flex-none px-4 py-2 bg-white text-primary rounded-xl font-bold text-xs shadow hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Update Profile</span>
              </button>
              <button
                onClick={() => setShowForgotPinModal(true)}
                className="flex-1 md:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                <span>Change PIN</span>
              </button>
            </div>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -bottom-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Registered Events</span>
              <span className="material-symbols-outlined text-primary text-xl">event</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {myRegistrations.length}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Events Attended</span>
              <span className="material-symbols-outlined text-emerald-500 text-xl">how_to_reg</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {myAttendance.length}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Community Events</span>
              <span className="material-symbols-outlined text-indigo-500 text-xl">groups</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {allEvents.length}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-xs font-semibold">Member Tenure</span>
              <span className="material-symbols-outlined text-amber-500 text-xl">verified</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {membershipDuration || 'Active'}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'events'
                ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">event_available</span>
            <span>My Registered Events ({myRegistrations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('explore')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'explore'
                ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">explore</span>
            <span>All Community Events ({allEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">account_circle</span>
            <span>My Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('idcard')}
            className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'idcard'
                ? 'bg-primary/10 text-primary border-b-2 border-primary font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-lg">badge</span>
            <span>Digital ID Card</span>
          </button>
        </div>

        {/* TAB 1: MY REGISTERED EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {registeredEventsWithDetails.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">
                  event_busy
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Event Registrations Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  You haven't registered for any events yet. Check out upcoming ITLC community events and join!
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl shadow hover:bg-primary/90 cursor-pointer"
                >
                  Explore Upcoming Events
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registeredEventsWithDetails.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 ${
                            item.isAttended
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}>
                            <span className="material-symbols-outlined text-xs">
                              {item.isAttended ? 'verified' : 'how_to_reg'}
                            </span>
                            {item.isAttended ? 'Attended' : (item.status || 'Confirmed')}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                            {item.event?.title}
                          </h4>
                        </div>

                        {item.event?.image && (
                          <div className="size-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <img
                              src={item.event.image}
                              alt={item.event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                          <span>{item.event?.date || 'Upcoming'}</span>
                          {item.event?.time && <span>• {item.event.time}</span>}
                        </div>
                        {item.event?.location && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary">pin_drop</span>
                            <span>{item.event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        Registered on {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Active'}
                      </span>
                      <button
                        onClick={() => navigate(`/event-registration/${item.event_id}?member=${member.id}`)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXPLORE ALL EVENTS */}
        {activeTab === 'explore' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming ITLC Events
              </h3>
              <span className="text-xs text-slate-500">
                {allEvents.length} events listed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allEvents.map((evt) => {
                const isRegistered = registeredEventIds.has(evt.id)
                return (
                  <div
                    key={evt.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {evt.image ? (
                        <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
                          <img
                            src={evt.image}
                            alt={evt.title}
                            className="w-full h-full object-cover"
                          />
                          {isRegistered && (
                            <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              Registered
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-28 w-full bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-end">
                          {isRegistered && (
                            <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                              Registered
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-4 space-y-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">
                          {evt.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {evt.description || 'Join IT Leaders Community for this premier gathering.'}
                        </p>

                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                            <span>{evt.date} {evt.time ? `• ${evt.time}` : ''}</span>
                          </div>
                          {evt.location && (
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                              <span className="line-clamp-1">{evt.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {evt.fee ? `₹${evt.fee}` : 'Free / Member Access'}
                      </span>
                      <button
                        onClick={() => navigate(`/event-registration/${evt.id}?member=${member.id}`)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isRegistered
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                            : 'bg-primary text-white hover:bg-primary/90 shadow shadow-primary/20'
                        }`}
                      >
                        {isRegistered ? 'View Registration' : 'Register Now'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MY PROFILE DETAILS */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Member Profile Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Your registered details with IT Leaders Community
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/update-profile')}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow hover:bg-primary/90 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => setShowForgotPinModal(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  <span>Reset / Change PIN</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Full Name</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.salutation ? `${member.salutation} ` : ''}{member?.full_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Primary Mobile Number</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.phone_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Email Address</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.email || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Location / City</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.location || 'Kerala'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                  Professional & Community Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Designation / Role</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.designation || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Company / Organization</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.company || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">ITLC Chapter</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.itlc_chapter_name || 'Kerala Chapter'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Area of Expertise / Industry</label>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {member?.area_of_expertise || member?.industry_sector || 'Information Technology'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                  4-Digit Login Security PIN
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used to verify your identity during check-ins and member sign-ins
                </p>
              </div>
              <button
                onClick={() => setShowForgotPinModal(true)}
                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Change PIN
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: OFFICIAL DIGITAL ID CARD (Matches Admin Dashboard) */}
        {activeTab === 'idcard' && (
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="w-full max-w-sm">
              <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-2xl overflow-hidden relative border border-slate-200/80 dark:border-slate-700">
                {/* Card Header */}
                <div className="px-4 py-3 flex justify-between items-center bg-white dark:bg-slate-800">
                  <div className="text-slate-900 dark:text-white text-sm font-semibold">
                    IT Leaders Community
                  </div>
                  <div className="border border-dashed border-slate-400 dark:border-slate-600 px-3 py-1.5 rounded-lg overflow-hidden">
                    {customLogo ? (
                      <img src={customLogo} alt="Logo" className="h-6 w-auto object-contain" />
                    ) : (
                      <img src="/itlc-logo.svg" alt="ITLC Logo" className="h-6 w-auto object-contain" />
                    )}
                  </div>
                </div>

                {/* Card Middle (Gray / Slate Background) */}
                <div className="bg-slate-300 dark:bg-slate-700 h-40 relative">
                  {/* Profile Picture Overlapping */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-36 h-36 rounded-full border-8 border-white dark:border-slate-800 overflow-hidden bg-slate-200 dark:bg-slate-600 shadow-lg z-10">
                    {member?.profile_image ? (
                      <img 
                        src={getImageUrl(member.profile_image)} 
                        alt={member.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = member.profile_image
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-center bg-cover bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500">person</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 pt-20 pb-6 relative bg-white dark:bg-slate-800">
                  <div className="text-center pr-24">
                    <div className="text-slate-600 dark:text-slate-400 text-sm mb-1 font-medium">
                      {member?.designation || 'Member'}
                    </div>
                    <div className="text-green-700 dark:text-green-500 text-lg font-bold uppercase tracking-wide">
                      {member?.full_name}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-mono font-semibold">
                      ID: {memberNumber || 'ITLC0001'}
                    </div>
                  </div>

                  {/* QR Code - Bottom Right */}
                  <div className="absolute right-4 bottom-6 w-20 h-20 bg-white border border-slate-300 dark:border-slate-600 flex items-center justify-center rounded p-1.5 shadow-sm">
                    <QRCodeCanvas 
                      value={`${window.location.origin}/member/${member?.id}`}
                      size={64}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </div>
              </div>

              {/* Membership Info Card Below */}
              <div className="mt-4 bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">
                  Membership Info
                </h3>
                <div className="space-y-1">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">calendar_today</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Joined</p>
                    </div>
                    <p className="text-slate-900 dark:text-white text-xs font-semibold text-right">
                      {member?.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }) : 'N/A'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">event_busy</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Expiry</p>
                    </div>
                    <p className="text-slate-900 dark:text-white text-xs font-semibold text-right">
                      {member?.expiry_date || 'Dec 31, 2026'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">location_city</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Chapter</p>
                    </div>
                    <p className="text-slate-900 dark:text-white text-xs font-semibold text-right">
                      {member?.itlc_chapter_name || 'Kerala Chapter'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-base">mail</span>
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">Email</p>
                    </div>
                    <p className="text-slate-900 dark:text-white text-xs font-semibold text-right truncate ml-2">
                      {member?.email || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate('/member/id-card')}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow hover:bg-primary/90 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-sm">fullscreen</span>
                  <span>Open Full ID Card View</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Forgot / Reset PIN Modal */}
      <ForgotPinModal
        isOpen={showForgotPinModal}
        onClose={() => setShowForgotPinModal(false)}
        initialPhone={member?.phone_number || ''}
        onSuccess={({ newPin }) => {
          setMember(prev => ({ ...prev, login_pin: newPin }))
        }}
      />
    </div>
  )
}
