import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import BottomNav from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { eventService } from '../services/eventService'

export default function Settings() {
  const navigate = useNavigate()
  const [customLogo, setCustomLogo] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#4F46E5')

  // Event Poster Template Management States
  const [eventsList, setEventsList] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [copiedPosterLink, setCopiedPosterLink] = useState(false)
  const [linkedinDescription, setLinkedinDescription] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)
  const [descSaved, setDescSaved] = useState(false)

  // Hotspot Area Management States
  const [hotspot, setHotspot] = useState(null)
  const [savingHotspot, setSavingHotspot] = useState(false)
  const [hotspotSaved, setHotspotSaved] = useState(false)
  const [hotspotAlign, setHotspotAlign] = useState('left')
  const [hotspotColor, setHotspotColor] = useState('#FFFFFF')
  const [hotspotNameSize, setHotspotNameSize] = useState(200)
  const [hotspotDesigSize, setHotspotDesigSize] = useState(162)
  const [hotspotCompSize, setHotspotCompSize] = useState(150)
  const [showHotspotEditor, setShowHotspotEditor] = useState(true)

  const hotspotContainerRef = useRef(null)
  const hotspotImgRef = useRef(null)
  const dragAction = useRef(null)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0, startX: 0, startY: 0 })

  useEffect(() => {
    // Load saved settings from localStorage first
    const savedLogo = localStorage.getItem('customLogo')
    const savedColor = localStorage.getItem('primaryColor')
    if (savedLogo) setCustomLogo(savedLogo)
    if (savedColor) setPrimaryColor(savedColor)

    // Fallback: load logo from shared app settings
    loadSharedLogo()
    fetchEventsList()
  }, [])

  const fetchEventsList = async () => {
    try {
      const data = await eventService.getEvents()
      if (data && data.length > 0) {
        setEventsList(data)
        setSelectedEventId(String(data[0].id))
      }
    } catch (e) {
      console.error('Error fetching events in settings:', e)
      try {
        const { data } = await supabase.from('events').select('*')
        if (data && data.length > 0) {
          setEventsList(data)
          setSelectedEventId(String(data[0].id))
        }
      } catch (err) {
        console.error('Fallback fetch error:', err)
      }
    }
  }

  const getDefaultDescriptionForEvent = (evt) => {
    if (!evt) return ''
    const eventTitle = evt.title || 'Event'
    const eventDate = evt.date || ''
    const eventTime = evt.time ? ` • ${evt.time}` : ''
    const venueParts = [evt.location, evt.venue, evt.address].filter(Boolean)
    const eventVenue = venueParts.length > 0 ? Array.from(new Set(venueParts)).join(', ') : 'Venue TBD'
    const hashtagTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '')

    return `I ({name}) am thrilled to announce that I will be attending ${eventTitle}!\n\n📅 Date: ${eventDate}${eventTime}\n📍 Venue: ${eventVenue}\n\nLooking forward to meeting industry leaders and peers.\n\n#ITLC #${hashtagTitle} #IAmAttending #TechLeadership`
  }

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedEvent(null)
      setPosterPreview('')
      setLinkedinDescription('')
      setHotspot(null)
      return
    }
    const evt = eventsList.find((e) => String(e.id) === String(selectedEventId))
    if (evt) {
      setSelectedEvent(evt)
      setPosterPreview(evt.poster_template || evt.image || '')
      const cached = localStorage.getItem(`event_linkedin_desc_${evt.id}`)
      const existingDesc = evt.linkedin_description || evt.poster_description || cached
      setLinkedinDescription(existingDesc || getDefaultDescriptionForEvent(evt))

      // Load poster hotspot
      const cachedHotspot = localStorage.getItem(`event_poster_hotspot_${evt.id}`)
      const rawHotspot = evt.poster_hotspot || cachedHotspot
      if (rawHotspot) {
        try {
          const parsed = typeof rawHotspot === 'string' ? JSON.parse(rawHotspot) : rawHotspot
          setHotspot(parsed)
          if (parsed.textAlign) setHotspotAlign(parsed.textAlign)
          if (parsed.textColor) setHotspotColor(parsed.textColor)
          if (parsed.nameFontSize) setHotspotNameSize(parsed.nameFontSize)
          if (parsed.desigFontSize) setHotspotDesigSize(parsed.desigFontSize)
          if (parsed.compFontSize) setHotspotCompSize(parsed.compFontSize)
        } catch (e) {
          console.error('Error parsing event hotspot:', e)
          setDefaultHotspot()
        }
      } else {
        setDefaultHotspot()
      }
    }
  }, [selectedEventId, eventsList])

  const setDefaultHotspot = () => {
    setHotspot({
      ratioX: 0.08,
      ratioY: 0.72,
      ratioW: 0.84,
      ratioH: 0.22,
      x: 86,
      y: 778,
      width: 907,
      height: 238,
      textAlign: 'left',
      textColor: '#FFFFFF',
      nameFontSize: 200,
      desigFontSize: 162,
      compFontSize: 150
    })
    setHotspotAlign('left')
    setHotspotColor('#FFFFFF')
    setHotspotNameSize(200)
    setHotspotDesigSize(162)
    setHotspotCompSize(150)
  }

  // Handle Box Drag (Move)
  const handleBoxMouseDown = (e) => {
    e.stopPropagation()
    if (e.button !== undefined && e.button !== 0) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragAction.current = 'move'
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      boxX: hotspot?.ratioX ?? 0.08,
      boxY: hotspot?.ratioY ?? 0.72,
      boxW: hotspot?.ratioW ?? 0.84,
      boxH: hotspot?.ratioH ?? 0.22
    }
  }

  // Handle Resize Corner
  const handleResizeMouseDown = (e) => {
    e.stopPropagation()
    if (e.button !== undefined && e.button !== 0) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragAction.current = 'resize'
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      boxX: hotspot?.ratioX ?? 0.08,
      boxY: hotspot?.ratioY ?? 0.72,
      boxW: hotspot?.ratioW ?? 0.84,
      boxH: hotspot?.ratioH ?? 0.22
    }
  }

  // Handle Container Mouse Down (Draw new area)
  const handleContainerMouseDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    if (!hotspotContainerRef.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const rect = hotspotContainerRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const startX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const startY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

    dragAction.current = 'draw'
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX,
      startY
    }
  }

  // Mouse / Touch Move & End event listener
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragAction.current || !hotspotContainerRef.current) return
      if (e.cancelable && (e.type === 'touchmove' || e.type === 'mousemove')) {
        e.preventDefault()
      }
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const rect = hotspotContainerRef.current.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const naturalW = hotspotImgRef.current?.naturalWidth || 1080
      const naturalH = hotspotImgRef.current?.naturalHeight || 1080

      if (dragAction.current === 'move') {
        const dx = (clientX - dragStart.current.mouseX) / rect.width
        const dy = (clientY - dragStart.current.mouseY) / rect.height
        const maxW = dragStart.current.boxW
        const maxH = dragStart.current.boxH
        const newX = Math.max(0, Math.min(1 - maxW, dragStart.current.boxX + dx))
        const newY = Math.max(0, Math.min(1 - maxH, dragStart.current.boxY + dy))

        setHotspot((prev) => ({
          ...prev,
          ratioX: Number(newX.toFixed(4)),
          ratioY: Number(newY.toFixed(4)),
          ratioW: Number(maxW.toFixed(4)),
          ratioH: Number(maxH.toFixed(4)),
          x: Math.round(newX * naturalW),
          y: Math.round(newY * naturalH),
          width: Math.round(maxW * naturalW),
          height: Math.round(maxH * naturalH)
        }))
      } else if (dragAction.current === 'resize') {
        const dw = (clientX - dragStart.current.mouseX) / rect.width
        const dh = (clientY - dragStart.current.mouseY) / rect.height
        const curX = dragStart.current.boxX
        const curY = dragStart.current.boxY
        const newW = Math.max(0.12, Math.min(1 - curX, dragStart.current.boxW + dw))
        const newH = Math.max(0.06, Math.min(1 - curY, dragStart.current.boxH + dh))

        setHotspot((prev) => ({
          ...prev,
          ratioW: Number(newW.toFixed(4)),
          ratioH: Number(newH.toFixed(4)),
          x: Math.round(curX * naturalW),
          y: Math.round(curY * naturalH),
          width: Math.round(newW * naturalW),
          height: Math.round(newH * naturalH)
        }))
      } else if (dragAction.current === 'draw') {
        const curX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const curY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
        const startX = dragStart.current.startX
        const startY = dragStart.current.startY

        const minX = Math.min(startX, curX)
        const minY = Math.min(startY, curY)
        const w = Math.max(0.08, Math.abs(curX - startX))
        const h = Math.max(0.05, Math.abs(curY - startY))

        setHotspot((prev) => ({
          ...prev,
          ratioX: Number(minX.toFixed(4)),
          ratioY: Number(minY.toFixed(4)),
          ratioW: Number(w.toFixed(4)),
          ratioH: Number(h.toFixed(4)),
          x: Math.round(minX * naturalW),
          y: Math.round(minY * naturalH),
          width: Math.round(w * naturalW),
          height: Math.round(h * naturalH),
          textAlign: hotspotAlign,
          textColor: hotspotColor,
          nameFontSize: hotspotNameSize,
          desigFontSize: hotspotDesigSize,
          compFontSize: hotspotCompSize
        }))
      }
    }

    const handleUp = () => {
      dragAction.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    window.addEventListener('touchcancel', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
      window.removeEventListener('touchcancel', handleUp)
    }
  }, [hotspotAlign, hotspotColor, hotspotNameSize, hotspotDesigSize, hotspotCompSize])

  const applyPreset = (presetName) => {
    const naturalW = hotspotImgRef.current?.naturalWidth || 1080
    const naturalH = hotspotImgRef.current?.naturalHeight || 1080
    let p = { ratioX: 0.08, ratioY: 0.72, ratioW: 0.84, ratioH: 0.22, textAlign: 'left' }
    if (presetName === 'bottom-center') {
      p = { ratioX: 0.1, ratioY: 0.72, ratioW: 0.8, ratioH: 0.22, textAlign: 'center' }
    } else if (presetName === 'bottom-left') {
      p = { ratioX: 0.06, ratioY: 0.72, ratioW: 0.55, ratioH: 0.22, textAlign: 'left' }
    } else if (presetName === 'bottom-right') {
      p = { ratioX: 0.42, ratioY: 0.72, ratioW: 0.52, ratioH: 0.22, textAlign: 'right' }
    } else if (presetName === 'center') {
      p = { ratioX: 0.15, ratioY: 0.55, ratioW: 0.7, ratioH: 0.24, textAlign: 'center' }
    }
    const updated = {
      ...hotspot,
      ...p,
      x: Math.round(p.ratioX * naturalW),
      y: Math.round(p.ratioY * naturalH),
      width: Math.round(p.ratioW * naturalW),
      height: Math.round(p.ratioH * naturalH),
      textAlign: p.textAlign,
      textColor: hotspotColor,
      nameFontSize: hotspotNameSize,
      desigFontSize: hotspotDesigSize,
      compFontSize: hotspotCompSize
    }
    setHotspot(updated)
    setHotspotAlign(p.textAlign)
  }

  const handleSaveHotspot = async () => {
    if (!selectedEventId || !hotspot) return
    setSavingHotspot(true)
    try {
      const naturalW = hotspotImgRef.current?.naturalWidth || 1080
      const naturalH = hotspotImgRef.current?.naturalHeight || 1080

      const fullHotspot = {
        ...hotspot,
        ratioX: hotspot.ratioX ?? Number(((hotspot.x || 0) / naturalW).toFixed(4)),
        ratioY: hotspot.ratioY ?? Number(((hotspot.y || 0) / naturalH).toFixed(4)),
        ratioW: hotspot.ratioW ?? Number(((hotspot.width || 400) / naturalW).toFixed(4)),
        ratioH: hotspot.ratioH ?? Number(((hotspot.height || 200) / naturalH).toFixed(4)),
        x: hotspot.x ?? Math.round((hotspot.ratioX || 0) * naturalW),
        y: hotspot.y ?? Math.round((hotspot.ratioY || 0) * naturalH),
        width: hotspot.width ?? Math.round((hotspot.ratioW || 0.5) * naturalW),
        height: hotspot.height ?? Math.round((hotspot.ratioH || 0.2) * naturalH),
        textAlign: hotspotAlign,
        textColor: hotspotColor,
        nameFontSize: Number(hotspotNameSize) || 48,
        desigFontSize: Number(hotspotDesigSize) || 36,
        compFontSize: Number(hotspotCompSize) || 30
      }

      const hotspotJson = JSON.stringify(fullHotspot)
      localStorage.setItem(`event_poster_hotspot_${selectedEventId}`, hotspotJson)

      setEventsList((prev) =>
        prev.map((ev) =>
          String(ev.id) === String(selectedEventId)
            ? { ...ev, poster_hotspot: hotspotJson }
            : ev
        )
      )

      const { error } = await supabase
        .from('events')
        .update({ poster_hotspot: hotspotJson })
        .eq('id', selectedEventId)

      if (error) {
        console.error('Supabase error saving poster_hotspot:', error)
      }

      setHotspot(fullHotspot)
      setHotspotSaved(true)
      setTimeout(() => setHotspotSaved(false), 2500)
    } catch (err) {
      console.error('Error saving poster hotspot:', err)
      setHotspotSaved(true)
      setTimeout(() => setHotspotSaved(false), 2500)
    } finally {
      setSavingHotspot(false)
    }
  }

  const handleSaveLinkedinDescription = async () => {
    if (!selectedEventId) return
    setSavingDesc(true)
    try {
      localStorage.setItem(`event_linkedin_desc_${selectedEventId}`, linkedinDescription)

      setEventsList((prev) =>
        prev.map((ev) =>
          String(ev.id) === String(selectedEventId)
            ? { ...ev, linkedin_description: linkedinDescription, poster_description: linkedinDescription }
            : ev
        )
      )

      const { error } = await supabase
        .from('events')
        .update({ linkedin_description: linkedinDescription })
        .eq('id', selectedEventId)

      if (error) {
        await supabase
          .from('events')
          .update({ poster_description: linkedinDescription })
          .eq('id', selectedEventId)
      }

      setDescSaved(true)
      setTimeout(() => setDescSaved(false), 2500)
    } catch (err) {
      console.error('Error saving linkedin description:', err)
      setDescSaved(true)
      setTimeout(() => setDescSaved(false), 2500)
    } finally {
      setSavingDesc(false)
    }
  }

  const handlePosterUpload = (e) => {
    const file = e.target.files[0]
    if (!file || !selectedEventId) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      const posterUrl = reader.result
      setPosterPreview(posterUrl)

      // Update local state
      setEventsList((prev) =>
        prev.map((ev) => (String(ev.id) === String(selectedEventId) ? { ...ev, poster_template: posterUrl } : ev))
      )

      // Save to Supabase events table
      try {
        const { error } = await supabase
          .from('events')
          .update({ poster_template: posterUrl })
          .eq('id', selectedEventId)

        if (error) {
          await supabase.from('events').update({ image: posterUrl }).eq('id', selectedEventId)
        }
      } catch (err) {
        console.error('Error saving poster template:', err)
      }
    }
    reader.readAsDataURL(file)
  }

  const copyPosterLink = () => {
    if (!selectedEventId) return
    const link = `${window.location.origin}/public/event/${selectedEventId}/poster`
    navigator.clipboard.writeText(link)
    setCopiedPosterLink(true)
    setTimeout(() => setCopiedPosterLink(false), 2500)
  }

  const loadSharedLogo = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'custom_logo')
        .maybeSingle()

      if (data?.setting_value && !localStorage.getItem('customLogo')) {
        setCustomLogo(data.setting_value)
        localStorage.setItem('customLogo', data.setting_value)
      }
    } catch (error) {
      console.error('Error loading shared logo:', error)
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const logoUrl = reader.result
        setCustomLogo(logoUrl)
        localStorage.setItem('customLogo', logoUrl)
        supabase
          .from('app_settings')
          .upsert(
            {
              setting_key: 'custom_logo',
              setting_value: String(logoUrl),
              description: 'Organization logo shown across public and admin pages',
            },
            { onConflict: 'setting_key' }
          )
          .then(({ error }) => {
            if (error) console.error('Error saving shared logo:', error)
          })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleColorChange = (color) => {
    setPrimaryColor(color)
    localStorage.setItem('primaryColor', color)
    document.documentElement.style.setProperty('--color-primary', color)
  }

  const removeLogo = () => {
    setCustomLogo('')
    localStorage.removeItem('customLogo')
    supabase
      .from('app_settings')
      .delete()
      .eq('setting_key', 'custom_logo')
      .then(({ error }) => {
        if (error) console.error('Error removing shared logo:', error)
      })
  }

  const settingsGroups = [
    {
      title: 'Admin',
      items: [
        {
          icon: 'add_circle',
          label: 'Create Event',
          description: 'Add a new event',
          path: '/admin/create-event',
          color: 'primary'
        },
        {
          icon: 'approval',
          label: 'Membership Requests',
          description: 'Review pending members',
          path: '/admin/membership-requests',
          color: 'blue'
        },
        {
          icon: 'supervisor_account',
          label: 'User Management',
          description: 'Manage admin & manager users',
          path: '/admin/users',
          color: 'red'
        },
        {
          icon: 'workspace_premium',
          label: 'Certificate Templates',
          description: 'Configure event certificate templates',
          path: '/admin/certificate-templates',
          color: 'amber'
        }
      ]
    },
    {
      title: 'Management',
      items: [
        {
          icon: 'calendar_view_month',
          label: 'All Events',
          description: 'View all events',
          path: '/events',
          color: 'purple'
        },
        {
          icon: 'person_add',
          label: 'Add Member',
          description: 'Register new member',
          path: '/membership-registration',
          color: 'green'
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'dark_mode',
          label: 'Theme',
          description: 'Light / Dark mode',
          action: 'theme',
          color: 'slate'
        },
        {
          icon: 'notifications',
          label: 'Notifications',
          description: 'Manage notifications',
          action: 'notifications',
          color: 'amber'
        }
      ]
    }
  ]

  const handleItemClick = (item) => {
    if (item.path) {
      navigate(item.path)
    } else if (item.action === 'theme') {
      const html = document.documentElement
      if (html.classList.contains('dark')) {
        html.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      } else {
        html.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your preferences</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">close</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-8">
        {/* Customization Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-2">
            Customization
          </h2>
          <div className="space-y-4">
            {/* Logo Upload */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-4 mb-4">
                <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">
                    image
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white">Custom Logo</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Upload your organization logo</p>
                </div>
              </div>

              {customLogo && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <img src={customLogo} alt="Custom Logo" className="h-12 w-12 object-contain rounded" />
                  <span className="text-sm text-slate-600 dark:text-slate-400 flex-1">Current logo</span>
                  <button
                    onClick={removeLogo}
                    className="text-red-500 hover:text-red-600 text-sm font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="cursor-pointer bg-primary hover:bg-primary/90 text-white text-center py-2.5 px-4 rounded-lg font-semibold transition-colors text-sm">
                  {customLogo ? 'Change Logo' : 'Upload Logo'}
                </div>
              </label>
            </div>

            {/* Event Poster Template Management */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-500 text-2xl">style</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white">Event "I Am Attending" Poster Template</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload custom PNG poster templates & copy shareable delegate poster links
                  </p>
                </div>
              </div>

              {/* Select Event Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-primary font-semibold cursor-pointer"
                >
                  <option value="">-- Choose an Event --</option>
                  {eventsList.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                  {/* Current Poster Preview */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Poster Template Frame</span>
                    <div className="h-44 w-full bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 relative overflow-hidden">
                      {posterPreview ? (
                        <img src={posterPreview} alt="Poster Template" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <p className="text-xs text-slate-400 text-center px-4">No custom template uploaded yet. Upload a PNG frame template below.</p>
                      )}
                    </div>
                  </div>

                  {/* Upload Poster Template Input */}
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      className="hidden"
                    />
                    <div className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2.5 px-4 rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">cloud_upload</span>
                      <span>{posterPreview ? 'Change Poster PNG Template' : 'Upload Poster PNG Template'}</span>
                    </div>
                  </label>

                  {/* Interactive Attendee Details Hotspot Area Marker */}
                  {posterPreview && (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-indigo-500 text-base">center_focus_strong</span>
                            <span>Attendee Name & Designation Hotspot Area</span>
                          </label>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Drag to reposition or drag the bottom-right corner to resize. Delegates' Name, Designation & Company will appear here by default.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowHotspotEditor(!showHotspotEditor)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>{showHotspotEditor ? 'Hide Workspace' : 'Open Workspace'}</span>
                          <span className="material-symbols-outlined text-sm">{showHotspotEditor ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </div>

                      {showHotspotEditor && (
                        <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          {/* Quick Position Presets */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Quick Presets:</span>
                            <button
                              type="button"
                              onClick={() => applyPreset('bottom-left')}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${hotspotAlign === 'left' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                            >
                              Bottom Left
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset('bottom-center')}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${hotspotAlign === 'center' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                            >
                              Bottom Center
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset('bottom-right')}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${hotspotAlign === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                }`}
                            >
                              Bottom Right
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset('center')}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                            >
                              Center Card
                            </button>
                          </div>

                          {/* Interactive Workspace Canvas */}
                          <div className="flex justify-center p-2 bg-slate-900/90 rounded-xl overflow-hidden shadow-inner border border-slate-800">
                            <div
                              ref={hotspotContainerRef}
                              onMouseDown={handleContainerMouseDown}
                              onTouchStart={handleContainerMouseDown}
                              className="relative select-none max-w-full overflow-hidden cursor-crosshair inline-block shadow-2xl rounded-md"
                              style={{ touchAction: 'none' }}
                            >
                              <img
                                ref={hotspotImgRef}
                                src={posterPreview}
                                alt="Poster Template"
                                className="max-h-[380px] w-auto max-w-full block pointer-events-none select-none rounded-md"
                              />

                              {/* Hotspot Box */}
                              {hotspot && (
                                <div
                                  onMouseDown={handleBoxMouseDown}
                                  onTouchStart={handleBoxMouseDown}
                                  style={{
                                    left: `${(hotspot.ratioX ?? 0.08) * 100}%`,
                                    top: `${(hotspot.ratioY ?? 0.72) * 100}%`,
                                    width: `${(hotspot.ratioW ?? 0.84) * 100}%`,
                                    height: `${(hotspot.ratioH ?? 0.22) * 100}%`
                                  }}
                                  className="absolute border-2 border-indigo-400 bg-indigo-500/25 backdrop-blur-[2px] rounded-lg cursor-grab active:cursor-grabbing flex flex-col justify-center px-3 py-1.5 shadow-xl select-none group"
                                >
                                  {/* Hotspot Badge */}
                                  <div className="absolute -top-3 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1 pointer-events-none">
                                    <span className="material-symbols-outlined text-[11px]">drag_pan</span>
                                    <span>Hotspot Area (Drag to move)</span>
                                  </div>

                                  {/* Dummy Attendee Text Preview */}
                                  <div
                                    style={{ textAlign: hotspotAlign, color: hotspotColor }}
                                    className="space-y-0.5 pointer-events-none w-full"
                                  >
                                    <div className="font-extrabold text-xs sm:text-sm leading-tight drop-shadow truncate">
                                      Attendee Name
                                    </div>
                                    <div className="text-[10px] sm:text-xs font-semibold opacity-90 leading-tight drop-shadow truncate">
                                      Designation / Title
                                    </div>
                                    <div className="text-[9px] sm:text-[11px] font-normal opacity-80 leading-tight drop-shadow truncate">
                                      Company / Organization
                                    </div>
                                  </div>

                                  {/* Corner Resize Handle */}
                                  <div
                                    onMouseDown={handleResizeMouseDown}
                                    onTouchStart={handleResizeMouseDown}
                                    title="Drag to resize hotspot area"
                                    className="absolute -bottom-2 -right-2 size-5 bg-indigo-600 hover:bg-indigo-700 border-2 border-white rounded-md cursor-se-resize shadow-md flex items-center justify-center text-white"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">crop_free</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hotspot Fine-Tuning Controls */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {/* Text Alignment */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Text Alignment</span>
                              <div className="flex items-center gap-1">
                                {[
                                  { id: 'left', label: 'Left', icon: 'format_align_left' },
                                  { id: 'center', label: 'Center', icon: 'format_align_center' },
                                  { id: 'right', label: 'Right', icon: 'format_align_right' }
                                ].map((al) => (
                                  <button
                                    key={al.id}
                                    type="button"
                                    onClick={() => {
                                      setHotspotAlign(al.id)
                                      setHotspot((prev) => ({ ...prev, textAlign: al.id }))
                                    }}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${hotspotAlign === al.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                      }`}
                                  >
                                    <span className="material-symbols-outlined text-sm">{al.icon}</span>
                                    <span>{al.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Default Text Color */}
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">Default Text Color</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={hotspotColor}
                                  onChange={(e) => {
                                    setHotspotColor(e.target.value)
                                    setHotspot((prev) => ({ ...prev, textColor: e.target.value }))
                                  }}
                                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
                                />
                                <div className="flex items-center gap-1 flex-1">
                                  {['#FFFFFF', '#0F172A', '#F59E0B', '#38BDF8', '#4ADE80'].map((c) => (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        setHotspotColor(c)
                                        setHotspot((prev) => ({ ...prev, textColor: c }))
                                      }}
                                      style={{ backgroundColor: c }}
                                      className={`size-6 rounded-md border ${hotspotColor === c ? 'ring-2 ring-indigo-500 scale-110' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Save Hotspot Button */}
                          <button
                            type="button"
                            onClick={handleSaveHotspot}
                            disabled={savingHotspot}
                            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">{hotspotSaved ? 'check' : 'save'}</span>
                            <span>{savingHotspot ? 'Saving Hotspot Area...' : hotspotSaved ? 'Hotspot Area Saved Successfully!' : 'Save Hotspot Area'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event LinkedIn Description Template */}
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Default LinkedIn Post Description
                      </label>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Tip: Use &#123;name&#125; for attendee's name
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      value={linkedinDescription}
                      onChange={(e) => setLinkedinDescription(e.target.value)}
                      placeholder="Type or edit default LinkedIn post description here..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg p-3 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                    />
                    <button
                      type="button"
                      onClick={handleSaveLinkedinDescription}
                      disabled={savingDesc}
                      className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">{descSaved ? 'check' : 'save'}</span>
                      <span>{savingDesc ? 'Saving Description...' : descSaved ? 'LinkedIn Description Saved!' : 'Save Event LinkedIn Description'}</span>
                    </button>
                  </div>

                  {/* Shareable Public Link & Action Buttons */}
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">Public Poster Creator Share Link</span>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/public/event/${selectedEvent.id}/poster`}
                        className="flex-1 bg-white dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 select-all focus:outline-none min-w-0"
                      />
                      <button
                        onClick={copyPosterLink}
                        className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">{copiedPosterLink ? 'check' : 'content_copy'}</span>
                        <span>{copiedPosterLink ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button
                        onClick={() => window.open(`/public/event/${selectedEvent.id}/poster`, '_blank')}
                        className="px-3.5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs font-bold rounded-md transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Preview Generator in New Tab"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Color Theme */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-4 mb-4">
                <div className="size-12 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-pink-500 text-2xl">
                    palette
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white">Primary Color</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Choose your brand color</p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  { color: '#4F46E5', name: 'Indigo' },
                  { color: '#7C3AED', name: 'Purple' },
                  { color: '#DC2626', name: 'Red' },
                  { color: '#059669', name: 'Green' },
                  { color: '#EA580C', name: 'Orange' },
                  { color: '#0891B2', name: 'Cyan' },
                  { color: '#2563EB', name: 'Blue' },
                  { color: '#DB2777', name: 'Pink' },
                  { color: '#65A30D', name: 'Lime' },
                  { color: '#0F172A', name: 'Slate' }
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => handleColorChange(item.color)}
                    className={`aspect-square rounded-xl border-4 transition-all hover:scale-110 ${primaryColor === item.color
                        ? 'border-slate-900 dark:border-white scale-110'
                        : 'border-slate-200 dark:border-slate-700'
                      }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  />
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Current color:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-slate-300 dark:border-slate-600" style={{ backgroundColor: primaryColor }}></div>
                    <span className="text-slate-900 dark:text-white font-mono font-semibold">{primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {settingsGroups.map((group, groupIndex) => (
          <section key={groupIndex}>
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-2">
              {group.title}
            </h2>
            <div className="space-y-2">
              {group.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  onClick={() => handleItemClick(item)}
                  className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-12 rounded-xl bg-${item.color}-500/10 flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-${item.color}-500 text-2xl`}>
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white">{item.label}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">
                      chevron_right
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* App Info */}
        <section className="pt-8">
          <div className="text-center space-y-2">
            <div className="inline-block bg-primary/10 dark:bg-primary/20 rounded-full p-3 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl">event</span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white">IT Leaders Event Registration</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Version 1.0.0</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 IT Leaders Community</p>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
