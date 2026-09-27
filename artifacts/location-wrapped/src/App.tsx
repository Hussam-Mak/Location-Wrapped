import { useEffect, useState, type ReactNode } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, ChevronRight, Compass, Home as HomeIcon, LockKeyhole, MapPin, Navigation2, Pause, Play, RotateCcw, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { useLocationTracker } from './services/locationTracker';
import { demoPlaces, type Place } from './services/locationService';
import { demoStatistics } from './services/statisticsService';
import { demoWrappedCards } from './services/wrappedGenerator';
import { formatCoordinates } from './services/visitProcessor';

type Tracker = ReturnType<typeof useLocationTracker>;
type Status = Tracker['state']['status'];
type RecordView = { lat: number; lng: number; timestamp: number | string | null };

function readRecord(raw: unknown): RecordView | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const lat = Number(record.lat ?? record.latitude);
  const lng = Number(record.lng ?? record.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const timestamp = record.timestamp ?? record.time ?? record.recordedAt ?? null;
  return { lat, lng, timestamp: typeof timestamp === 'number' || typeof timestamp === 'string' ? timestamp : null };
}
function prettyTime(value: number | string | null | undefined) {
  if (!value) return 'Not yet recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet recorded';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function prettyDate(value: number | string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
function textValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'name' in value) return String((value as { name: unknown }).name);
  return 'Not available';
}

function Brand({ to = '/' }: { to?: string }) {
  return <Link href={to} className="brand" aria-label="Location Wrapped home" data-testid="link-brand"><span className="brand-mark"><Navigation2 strokeWidth={2.2} /></span><span>location wrapped<span style={{ color: '#a3e635' }}>.</span></span></Link>;
}
function Topbar({ mode, home = '/' }: { mode?: Tracker['state']['mode']; home?: string }) {
  return <header className="topbar"><Brand to={home} /><div className="topbar-right">{mode === 'demo' ? <span className="micro-label mode-label" data-testid="status-demo-mode">DEMO MODE</span> : <span className="micro-label" style={{ display: mode ? 'none' : undefined }}>A LITTLE MORE HERE.</span>}</div></header>;
}
function Button({ children, variant = 'primary', onClick, disabled, wide = false, testId, type = 'button' }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'outline' | 'danger'; onClick?: () => void; disabled?: boolean; wide?: boolean; testId: string; type?: 'button' | 'submit' }) {
  return <button type={type} className={`btn btn-${variant}${wide ? ' btn-wide' : ''}`} onClick={onClick} disabled={disabled} data-testid={testId}>{children}</button>;
}
function PageHeader({ label, title, description, action }: { label: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-intro"><div><div className="micro-label" style={{ color: '#a3e635' }}>{label}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <section className="page-section"><div className="section-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
function Nav({ current }: { current: string }) {
  const items = [{ to: '/home', label: 'Home', icon: HomeIcon }, { to: '/map', label: 'Map', icon: MapPin }, { to: '/wrapped', label: 'Wrapped', icon: Sparkles }, { to: '/profile', label: 'Profile', icon: UserRound }];
  return <nav className="bottom-nav" aria-label="Main navigation"><div className="nav-inner">{items.map(({ to, label, icon: Icon }) => <Link key={to} href={to} aria-current={current === to ? 'page' : undefined} className={`nav-link${current === to ? ' active' : ''}`} data-testid={`link-${label.toLowerCase()}`}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</div></nav>;
}
function Shell({ children, current, mode }: { children: ReactNode; current: string; mode: Tracker['state']['mode'] }) {
  return <div className="app-frame"><div className="app-shell"><Topbar mode={mode} home="/home" /><main>{children}</main></div><Nav current={current} /></div>;
}
function Landing({ startDemo }: { startDemo: () => void }) {
  const [, navigate] = useLocation();
  return <div className="landing"><Topbar /><main className="landing-main"><div className="landing-copy"><div className="eyebrow micro-label"><span className="eyebrow-line" />A PERSONAL ATLAS OF YOUR YEAR</div><h1 className="display"><span>Your year.</span><span>Your places.</span><span className="italic">Your story.</span></h1><p className="lede">Location Wrapped remembers the places you go and turns your year into a story.</p><div className="actions"><Button onClick={() => navigate('/onboarding/1')} testId="button-start-wrapped">Start My Wrapped <ArrowRight /></Button><Button variant="secondary" onClick={startDemo} testId="button-try-demo">Try Demo <ChevronRight /></Button></div></div><div className="landing-art" aria-hidden="true"><div className="art-orbit" /><div className="art-orbit" /><div className="art-orbit" /><div className="art-disc" /><span className="art-dot" /><span className="art-dot alt" /><span className="art-caption micro-label">Every place means something</span></div></main><footer className="landing-footer"><span>YOUR PLACES, YOUR PACE.</span><span>MADE FOR LOOKING BACK.</span></footer></div>;
}
function Onboarding({ step, tracker }: { step: 1 | 2 | 3; tracker: Tracker }) {
  const [, navigate] = useLocation();
  const [pending, setPending] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const content = [
    { title: 'Your year starts here', copy: 'Location Wrapped records the places you visit so you can look back on where your year took you.', icon: Compass },
    { title: 'Built around your privacy', copy: 'Location access is always your choice. Pause tracking whenever you like, or delete your location history in Profile.', icon: LockKeyhole },
    { title: 'Enable Location Tracking', copy: 'Give this browser location access to start collecting your own story, from this moment on.', icon: MapPin },
  ][step - 1];
  const Icon = content.icon;
  const denied = tracker.state.status === 'denied' || tracker.state.status === 'unavailable';
  useEffect(() => { if (step === 3 && tracker.state.status === 'active' && tracker.state.mode === 'real') navigate('/tracking'); }, [step, tracker.state.status, tracker.state.mode, navigate]);
  const allow = async () => { setPending(true); setPermissionError(false); try { await Promise.resolve(tracker.requestAccess()); } catch { setPermissionError(true); } finally { setPending(false); } };
  return <div className="onboarding"><Topbar home="/" /><main className="onboarding-content"><div className={`onboarding-visual visual-step-${step}`} aria-hidden="true"><div className="visual-core"><Icon /></div></div><div className="onboarding-words"><div className="step-count micro-label">GETTING STARTED / 0{step} OF 03</div><h1 className="page-title">{content.title}</h1><p className="page-copy">{content.copy}</p>{step === 2 && <p className="note"><strong>Good to know:</strong> Browser tracking only works while this page is open. It does not track in the background or recover past trips.</p>}{step === 3 && <><p className="note"><strong>A clear boundary:</strong> This browser only records location while this page is open. Closing the page stops collection; past location history is not imported.</p>{(denied || permissionError) && <div className="alert" role="alert" data-testid="status-permission-denied">{tracker.state.status === 'unavailable' ? 'Location is not available in this browser. Check that location services are enabled and use a secure connection, then try again.' : 'Location access was not allowed. You can enable it in your browser’s site settings and try again, or explore the demo instead.'}</div>}</>}{step === 3 && <div className="actions"><Button testId="button-allow-location" onClick={allow} disabled={pending || tracker.state.status === 'requesting'}>{pending || tracker.state.status === 'requesting' ? 'Requesting access…' : denied ? 'Try Location Access Again' : 'Allow Location Access'} <ArrowRight /></Button>{(denied || permissionError) && <Button variant="secondary" testId="button-demo-after-denial" onClick={() => { tracker.startDemo(); navigate('/home'); }}>Try Demo</Button>}</div>}</div></main><div className="onboarding-foot"><div className="steps" aria-label={`Step ${step} of 3`}>{[1,2,3].map(s => <span key={s} className={s === step ? 'current' : ''} />)}</div>{step < 3 ? <Button testId="button-onboarding-next" onClick={() => navigate(`/onboarding/${step + 1}`)}>Continue <ArrowRight /></Button> : <Button variant="outline" testId="button-onboarding-back" onClick={() => navigate('/onboarding/2')}><ArrowLeft /> Back</Button>}</div></div>;
}
function TrackingStatus({ tracker }: { tracker: Tracker }) {
  const [, navigate] = useLocation();
  const { state } = tracker;
  const last = [...state.records].reverse().map(readRecord).find(Boolean);
  const isDemo = state.mode === 'demo';
  const active = !isDemo && state.status === 'active';
  const title = isDemo ? 'Exploring the demo' : active ? 'Tracking is active' : state.status === 'paused' ? 'Tracking is paused' : state.status === 'denied' ? 'Location access denied' : 'Tracking is inactive';
  const subtitle = isDemo ? 'Sample places, not your location history.' : active ? 'Your story is taking shape while this page is open.' : state.status === 'paused' ? 'No new locations are being recorded.' : 'Allow location access to begin your story.';
  return <div className="panel status-panel" data-testid="card-tracking-status"><div className="status-top"><div className="status-heading"><span className={`status-dot${active ? '' : state.status === 'paused' ? ' paused' : ' off'}`} aria-hidden="true" /><div><h2 data-testid="status-tracking">{title}</h2><p>{subtitle}</p></div></div><span className="micro-label" style={{ color: active ? '#a3e635' : '#9998a9' }}>{isDemo ? 'SAMPLE' : active ? 'LIVE' : state.status.toUpperCase()}</span></div><div className="status-grid"><div><span>Last location recorded</span><strong data-testid="text-last-location">{isDemo ? 'Demo only' : last ? formatCoordinates(last.lat, last.lng) : 'Not yet recorded'}</strong></div><div><span>Last update</span><strong data-testid="text-last-update">{isDemo ? 'Not tracking' : prettyTime(state.lastUpdate)}</strong></div></div>{!isDemo && state.error && <p className="status-error" role="alert">{state.error}</p>}{!isDemo && ['inactive', 'denied', 'unavailable'].includes(state.status) && <button className="text-link" onClick={() => navigate('/onboarding/3')} data-testid="button-enable-from-status">Enable location tracking <ArrowRight /></button>}</div>;
}
function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="empty-card"><div className="empty-icon"><Navigation2 size={23} /></div><h2>{title}</h2><p>{children}</p>{action}</div>;
}
function TrackingConfirmation({ tracker }: { tracker: Tracker }) {
  const [, navigate] = useLocation();
  return <Shell current="/home" mode={tracker.state.mode}><PageHeader label="A NEW CHAPTER" title="You're tracking" description="Your Location Wrapped starts building from here." /><Section title="Your tracking status"><TrackingStatus tracker={tracker} /></Section><p className="note" style={{ marginBottom: 24 }}>Location is only collected while this page is open. Keep it open to record visits; closing it stops collection.</p><Button testId="button-go-home" onClick={() => navigate('/home')}>Go to Home <ArrowRight /></Button></Shell>;
}
function HomePage({ tracker }: { tracker: Tracker }) {
  const [, navigate] = useLocation();
  const demo = tracker.state.mode === 'demo';
  return <Shell current="/home" mode={tracker.state.mode}><PageHeader label={demo ? 'DEMO / SAMPLE HISTORY' : 'YOUR STORY / IN PROGRESS'} title={demo ? 'A year in places.' : 'Your story starts here.'} description={demo ? 'An example of what your location story could look like.' : 'Every visit starts with a single moment.'} /><div className="home-grid"><Section title="Tracking"><TrackingStatus tracker={tracker} /></Section>{demo ? <><Section title="The little details"><div className="hero-stat"><span className="micro-label">PLACES IN THIS DEMO</span><strong className="number" data-testid="text-places-visited">{textValue(demoStatistics.placesVisited)}</strong><span className="stat-label">places visited</span></div><div className="stat-row"><div><span className="micro-label">TIME OUT IN THE WORLD</span><strong className="stat-value" data-testid="text-days-tracked">{textValue(demoStatistics.daysTracked)}</strong><span className="stat-small">days tracked</span></div><div><span className="micro-label">DISTANCE COVERED</span><strong className="stat-value" data-testid="text-distance">{textValue(demoStatistics.distanceKm)}<small style={{ fontSize: '.35em', marginLeft: 4 }}>km</small></strong><span className="stat-small">along the way</span></div></div><div style={{ marginTop: 22 }}><div className="stat-line"><span className="micro-label">MOST VISITED</span><strong data-testid="text-most-visited">{textValue(demoStatistics.mostVisitedPlace)}</strong></div><div className="stat-line"><span className="micro-label">MOST ACTIVE DAY</span><strong data-testid="text-most-active-day">{textValue(demoStatistics.mostActiveDay)}</strong></div></div></Section><Section title="The story so far"><div className="progress-card"><div className="micro-label">WRAPPED / DEMO PREVIEW</div><h2>Your Wrapped is building...</h2><p>See how the places you return to become a story worth keeping.</p><div className="progress-track" aria-hidden="true"><span /></div><div style={{ marginTop: 24 }}><button className="text-link" onClick={() => navigate('/wrapped')} data-testid="button-preview-wrapped">Explore demo Wrapped <ArrowRight /></button></div></div></Section></> : <><Section title="Your places"><EmptyState title="The map begins with you." action={<Button testId="button-view-map" variant="secondary" onClick={() => navigate('/map')}>View your map <ArrowRight /></Button>}>No places yet. Your recorded coordinates will appear as you keep this page open and move around. We won't invent places or visits.</EmptyState></Section><Section title="Your Wrapped"><div className="progress-card"><div className="micro-label">YOUR STORY / JUST BEGINNING</div><h2>Your Wrapped is building...</h2><p>Once you've collected enough of your own history, there will be a story to tell. For now, you can explore a clearly labeled sample.</p><div className="progress-track" aria-hidden="true"><span /></div><div style={{ marginTop: 24 }}><button className="text-link" onClick={() => navigate('/wrapped')} data-testid="button-preview-wrapped">See demo preview <ArrowRight /></button></div></div></Section></>}</div></Shell>;
}
function MapPage({ tracker }: { tracker: Tracker }) {
  const [selected, setSelected] = useState<Place | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordView | null>(null);
  const demo = tracker.state.mode === 'demo';
  const records = tracker.state.records.map(readRecord).filter((item): item is RecordView => Boolean(item));
  useEffect(() => {
    if (!selected && !selectedRecord) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSelected(null); setSelectedRecord(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, selectedRecord]);
  const places = demo ? demoPlaces : [];
  const visibleRecords = records.slice(-12);
  const pointPosition = (index: number, total: number) => ({ left: `${19 + ((index * 37 + 15) % 63)}%`, top: `${21 + ((index * 29 + 8) % 56)}%` });
  return <Shell current="/map" mode={tracker.state.mode}><PageHeader label={demo ? 'DEMO / SAMPLE MAP' : 'YOUR MAP / LIVE RECORDS'} title="Your map." description={demo ? 'The places in this sample story. Tap a marker to take a closer look.' : 'Only your recorded coordinates appear here. Place names and visit summaries are not available yet.'} /><div className="map-layout"><div className="map-canvas" role="group" aria-label={demo ? 'Illustrated demo map with clickable place markers' : 'Illustrated map of recorded coordinates'}><div className="map-block one" /><div className="map-block two" /><div className="map-block three" /><div className="map-block four" /><div className="map-road" /><span className="map-label one">THE NEIGHBORHOOD</span><span className="map-label two">A PLACE TO REMEMBER</span><div className="map-key micro-label">{demo ? 'SAMPLE MAP / NOT TO SCALE' : 'YOUR RECORDS / SCHEMATIC VIEW'}</div>{demo ? places.map((place, index) => <button key={place.id} className={`map-marker${selected?.id === place.id ? ' selected' : ''}`} style={pointPosition(index, places.length)} onClick={() => setSelected(place)} aria-label={`View ${place.name}`} data-testid={`button-map-marker-${place.id}`}><MapPin /></button>) : visibleRecords.map((record, index) => <button key={`${record.timestamp ?? 'point'}-${index}`} className="map-marker" style={pointPosition(index, visibleRecords.length)} onClick={() => setSelectedRecord(record)} aria-label={`View recorded location ${index + 1}`} data-testid={`button-record-marker-${index}`}><MapPin /></button>)}</div><div><Section title={demo ? `${places.length} sample places` : 'Recorded coordinates'}>{demo ? <div className="place-list">{places.map(place => <button className="place-row" key={place.id} onClick={() => setSelected(place)} data-testid={`button-place-${place.id}`}><div><strong>{place.name}</strong><span>{textValue(place.category)} · {textValue(place.visits)} visits</span></div><ChevronRight /></button>)}</div> : visibleRecords.length ? <div className="place-list">{visibleRecords.slice().reverse().map((record, index) => <button className="place-row" key={`${record.timestamp ?? 'record'}-${index}`} onClick={() => setSelectedRecord(record)} data-testid={`button-record-${index}`}><div><strong>{formatCoordinates(record.lat, record.lng)}</strong><span>{prettyTime(record.timestamp)}</span></div><ChevronRight /></button>)}</div> : <EmptyState title="No points on your map yet.">Keep this page open with tracking active to record your first location. There are no sample places mixed into your history.</EmptyState>}</Section></div></div>{(selected || selectedRecord) && <div className="sheet-overlay" onClick={() => { setSelected(null); setSelectedRecord(null); }}><div className="detail-sheet" role="dialog" aria-modal="true" aria-label="Location details" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-head"><div><span className="micro-label" style={{ color: '#a3e635' }}>{selected ? 'DEMO PLACE' : 'YOUR RECORDED POINT'}</span><h2 data-testid="text-place-name">{selected?.name ?? (selectedRecord ? formatCoordinates(selectedRecord.lat, selectedRecord.lng) : '')}</h2></div><button className="icon-button" onClick={() => { setSelected(null); setSelectedRecord(null); }} aria-label="Close details" data-testid="button-close-details"><X /></button></div><div className="detail-grid"><div><span>Visits</span><strong data-testid="text-place-visits">{selected ? textValue(selected.visits) : 'Not available yet'}</strong></div><div><span>Time spent</span><strong data-testid="text-place-time">{selected ? textValue(selected.timeSpent) : 'Not available yet'}</strong></div><div><span>Last visited</span><strong data-testid="text-place-last-visited">{selected ? prettyDate(selected.lastVisited) : prettyDate(selectedRecord?.timestamp)}</strong></div><div><span>Location</span><strong>{selected ? formatCoordinates(selected.lat, selected.lng) : selectedRecord ? formatCoordinates(selectedRecord.lat, selectedRecord.lng) : ''}</strong></div></div></div></div>}</Shell>;
}
function WrappedPage({ tracker }: { tracker: Tracker }) {
  const [index, setIndex] = useState<number | null>(null);
  const demo = tracker.state.mode === 'demo';
  const cards = demoWrappedCards.slice(0, 3);
  const next = () => setIndex(current => current === null ? 0 : current >= cards.length - 1 ? null : current + 1);
  const previous = () => setIndex(current => current === null ? null : Math.max(0, current - 1));
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setIndex(null); if (event.key === 'ArrowRight') next(); if (event.key === 'ArrowLeft') previous(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, cards.length]);
  const card = index === null ? null : cards[index];
  return <Shell current="/wrapped" mode={tracker.state.mode}><PageHeader label="WRAPPED / PREVIEW" title="A story in the making." description={demo ? 'Three moments from a sample year. This is demo data, not your own history.' : 'Your personal Wrapped needs more history. Explore a clearly labeled sample of how it could feel.'} /><div className="wrapped-entry"><div><div className="micro-label" style={{ color: '#a3e635' }}>03 CARDS / DEMO STORY</div></div><div><h2>Every place leaves a little something behind.</h2><p>Take a look at a sample Wrapped while your own story begins to grow.</p></div><Button testId="button-play-wrapped" onClick={() => setIndex(0)}>Play demo Wrapped <ArrowRight /></Button></div>{card && <div className={`story theme-${index}`} role="dialog" aria-modal="true" aria-label={`Demo Wrapped card ${index! + 1} of ${cards.length}`}><div className="story-progress">{cards.map((item, n) => <button key={item.id} className={n < index! ? 'done' : n === index ? 'current' : ''} onClick={() => setIndex(n)} aria-label={`Go to card ${n + 1}`} data-testid={`button-story-progress-${n}`} />)}</div><div className="story-header"><span className="micro-label">LOCATION WRAPPED / DEMO</span><button className="icon-button" onClick={() => setIndex(null)} aria-label="Close Wrapped" data-testid="button-close-wrapped"><X /></button></div><div className="story-body" key={card.id}><div className="story-kicker">{card.kicker}</div><h2 className="story-title" data-testid="text-story-title">{card.title}</h2><div className="story-metric" data-testid="text-story-metric">{card.metric}</div><p className="story-caption">{card.caption}</p></div><div className="story-footer"><button onClick={previous} disabled={index === 0} data-testid="button-previous-card"><ArrowLeft /> Previous</button><span className="micro-label" style={{ color: 'inherit' }}>0{index! + 1} / 0{cards.length}</span>{index === cards.length - 1 ? <button onClick={() => setIndex(0)} data-testid="button-replay-wrapped">Replay <RotateCcw /></button> : <button onClick={next} data-testid="button-next-card">Next <ArrowRight /></button>}</div></div>}</Shell>;
}
function ProfilePage({ tracker }: { tracker: Tracker }) {
  const [, navigate] = useLocation();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const demo = tracker.state.mode === 'demo';
  const toggle = () => { if (tracker.state.status === 'active') tracker.pause(); else tracker.resume(); };
  const erase = () => { tracker.clearHistory(); setConfirm(false); setMessage('Your location history has been deleted from this browser.'); };
  useEffect(() => {
    if (!confirm) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirm(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);
  return <Shell current="/profile" mode={tracker.state.mode}><PageHeader label="YOUR SPACE / SETTINGS" title="Your space." description="Your location story belongs to you. You're always in control." />{message && <div className="alert" role="status" data-testid="status-delete-success">{message}</div>}<Section title="Tracking"><TrackingStatus tracker={tracker} /></Section><Section title="Your controls"><div className="settings-list">{!demo && <button className="setting-row" onClick={toggle} disabled={tracker.state.status !== 'active' && tracker.state.status !== 'paused'} data-testid="button-toggle-tracking"><div><strong>{tracker.state.status === 'active' ? 'Pause tracking' : 'Resume tracking'}</strong><span>{tracker.state.status === 'active' ? 'Stop recording new locations for now.' : 'Start recording again while this page is open.'}</span></div>{tracker.state.status === 'active' ? <Pause /> : <Play />}</button>}{demo && <button className="setting-row" onClick={() => navigate('/onboarding/1')} data-testid="button-start-real-tracking"><div><strong>Start your own story</strong><span>Enable location access and leave the sample behind.</span></div><ArrowRight /></button>}<button className="setting-row" onClick={() => navigate('/wrapped')} data-testid="button-replay-demo"><div><strong>Replay demo Wrapped</strong><span>A preview with sample data, never your history.</span></div><RotateCcw /></button><button className="setting-row danger" onClick={() => setConfirm(true)} data-testid="button-delete-history"><div><strong>{demo ? 'Leave demo & clear history' : 'Delete location history'}</strong><span>{demo ? 'Remove the demo and any stored location records.' : 'Permanently remove your recorded locations from this browser.'}</span></div><Trash2 /></button></div></Section><div className="about-card" id="about"><div className="micro-label" style={{ color: '#a3e635', marginBottom: 14 }}>ABOUT THE APP</div><h2>About Location Wrapped</h2><p>Location Wrapped turns the places you go into a story of your year. In this first version, tracking begins only when you grant permission and works only while this page is open. It cannot track in the background, import past trips, or identify place names from your coordinates. Demo content is always labeled and kept separate from your history.</p></div>{confirm && <div className="sheet-overlay" onClick={() => setConfirm(false)}><div className="detail-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-head"><div><span className="micro-label" style={{ color: '#f38a8a' }}>THIS CAN'T BE UNDONE</span><h2 id="confirm-title">Delete your history?</h2></div><button className="icon-button" onClick={() => setConfirm(false)} aria-label="Close confirmation" data-testid="button-close-confirmation"><X /></button></div><p className="confirm-copy" id="confirm-description">This removes your saved location records from this browser. Your demo preview can always be opened again.</p><div className="confirm-actions"><Button variant="outline" testId="button-cancel-delete" onClick={() => setConfirm(false)}>Keep history</Button><Button variant="danger" testId="button-confirm-delete" onClick={erase}>Delete history</Button></div></div></div>}</Shell>;
}
function NotFoundPage() {
  return <div className="landing"><Topbar /><main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div className="micro-label" style={{ color: '#a3e635', marginBottom: 24 }}>AN UNMAPPED TURN / 404</div><h1 className="page-title">This place isn't on the map.</h1><p className="page-copy">Let's get you back to somewhere familiar.</p><Link href="/" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} data-testid="link-return-home"><ArrowLeft size={17} /> Back to the beginning</Link></main></div>;
}
function AppRoutes() {
  const tracker = useLocationTracker();
  const [, navigate] = useLocation();
  const startDemo = () => { tracker.startDemo(); navigate('/home'); };
  return <Switch><Route path="/">{() => <Landing startDemo={startDemo} />}</Route><Route path="/onboarding/1">{() => <Onboarding step={1} tracker={tracker} />}</Route><Route path="/onboarding/2">{() => <Onboarding step={2} tracker={tracker} />}</Route><Route path="/onboarding/3">{() => <Onboarding step={3} tracker={tracker} />}</Route><Route path="/tracking">{() => <TrackingConfirmation tracker={tracker} />}</Route><Route path="/home">{() => <HomePage tracker={tracker} />}</Route><Route path="/map">{() => <MapPage tracker={tracker} />}</Route><Route path="/wrapped">{() => <WrappedPage tracker={tracker} />}</Route><Route path="/profile">{() => <ProfilePage tracker={tracker} />}</Route><Route component={NotFoundPage} /></Switch>;
}
function App() {
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AppRoutes /></WouterRouter>;
}
export default App;