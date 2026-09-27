import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { nativePalette } from '@/constants/colors';
import { useLocation } from '@/context/LocationContext';
import { demoPlaces, demoStatistics, demoWrappedCards } from '@/services/demoData';
import { formatCoordinates } from '@/services/locationProcessing';

type Place = (typeof demoPlaces)[number];
type RecordLocation = { lat: number; lng: number; timestamp: number; accuracy?: number };

function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

function Brand({ mode, landing = false }: { mode?: string; landing?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.brandRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Location Wrapped home"
        testID="link-brand"
        onPress={() => router.replace(landing ? '/' : '/(tabs)')}
        style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
      >
        <View style={[styles.brandMark, { borderColor: colors.lime }]}>
          <Ionicons name="navigate" size={18} color={colors.lime} />
        </View>
        <Text style={styles.brandName}>location wrapped<Text style={{ color: colors.lime }}>.</Text></Text>
      </Pressable>
      {mode === 'demo' ? <Text testID="status-demo-mode" style={[styles.modeBadge, { color: colors.lime, borderColor: `${colors.lime}66` }]}>DEMO MODE</Text> : landing ? <Label style={styles.brandTag}>A LITTLE MORE HERE.</Label> : null}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  testID,
  variant = 'primary',
  disabled,
  icon,
  wide,
}: {
  title: string;
  onPress: () => void;
  testID: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>['name'];
  wide?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        wide && styles.buttonWide,
        variant === 'primary' && { backgroundColor: colors.lime },
        variant === 'secondary' && { backgroundColor: colors.secondary },
        variant === 'outline' && { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
        variant === 'danger' && { backgroundColor: colors.pink },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'primary' || variant === 'danger' ? { color: colors.background } : { color: colors.foreground }]}>{title}</Text>
      {icon ? <Feather name={icon} size={17} color={variant === 'primary' || variant === 'danger' ? colors.background : colors.foreground} /> : null}
    </Pressable>
  );
}

function Intro({ label, title, description }: { label: string; title: string; description?: string }) {
  const colors = useColors();
  return (
    <View style={styles.intro}>
      <Label style={{ color: colors.lime }}>{label}</Label>
      <Text style={styles.pageTitle}>{title}</Text>
      {description ? <Text style={styles.introCopy}>{description}</Text> : null}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function PageFrame({ children, mode }: { children: React.ReactNode; mode: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={[styles.topbar, { borderBottomColor: colors.border }]}>
          <Brand mode={mode} />
        </View>
      </SafeAreaView>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 18) + 94 }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function StatusCard() {
  const colors = useColors();
  const { state } = useLocation();
  const demo = state.mode === 'demo';
  const active = !demo && state.status === 'active';
  const title = demo ? 'Exploring the demo' : active ? 'Tracking is active' : state.status === 'paused' ? 'Tracking is paused' : state.status === 'denied' ? 'Location access denied' : state.status === 'unavailable' ? 'Location is unavailable' : 'Tracking is inactive';
  const subtitle = demo ? 'Sample places, not your location history.' : active ? 'Your story is taking shape while this app is open.' : state.status === 'paused' ? 'No new locations are being recorded.' : 'Allow location access to begin your story.';
  const last = state.mode === 'real' ? state.records[state.records.length - 1] as RecordLocation | undefined : undefined;
  return (
    <View style={[styles.panel, { backgroundColor: colors.card }]} testID="card-tracking-status">
      <View style={styles.statusTop}>
        <View style={styles.statusLead}>
          <View style={[styles.statusDot, { backgroundColor: active || demo ? colors.lime : state.status === 'paused' ? colors.orange : colors.mutedForeground }]} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle} testID="status-tracking">{title}</Text>
            <Text style={styles.bodyMuted}>{subtitle}</Text>
          </View>
        </View>
        <Label style={{ color: demo || active ? colors.lime : colors.mutedForeground }}>{demo ? 'SAMPLE' : state.status.toUpperCase()}</Label>
      </View>
      <View style={[styles.statusStats, { borderTopColor: colors.border }]}>
        <View style={styles.statusStat}>
          <Text style={styles.smallMuted}>Last location recorded</Text>
          <Text style={styles.statusValue} testID="text-last-location">{demo ? 'Demo only' : last ? formatCoordinates(last.lat, last.lng) : 'Not yet recorded'}</Text>
        </View>
        <View style={styles.statusStat}>
          <Text style={styles.smallMuted}>Last update</Text>
          <Text style={styles.statusValue} testID="text-last-update">{demo ? 'Not tracking' : prettyTime(state.lastUpdate)}</Text>
        </View>
      </View>
      {!demo && state.error ? <Text accessibilityRole="alert" style={styles.errorText}>{state.error}</Text> : null}
      {!demo && ['inactive', 'denied', 'unavailable'].includes(state.status) ? (
        <Pressable testID="button-enable-from-status" onPress={() => router.push('/onboarding/3')} style={styles.textLink}>
          <Text style={{ color: colors.lime, fontWeight: '700' }}>Enable location tracking</Text><Feather name="arrow-right" size={16} color={colors.lime} />
        </Pressable>
      ) : null}
    </View>
  );
}

function prettyTime(value: number | null | undefined) {
  if (!value) return 'Not yet recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not yet recorded' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function EmptyCard({ title, children, action }: { title: string; children: string; action?: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.panel, styles.emptyCard, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Ionicons name="navigate-outline" size={22} color={colors.lime} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.bodyMuted}>{children}</Text>
      {action}
    </View>
  );
}

export function LandingScreen() {
  const colors = useColors();
  const { startDemo } = useLocation();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.landing, { backgroundColor: colors.background }]}>
      <View style={[styles.topbar, { borderBottomColor: colors.border }]}><Brand landing /></View>
      <ScrollView contentContainerStyle={styles.landingScroll} showsVerticalScrollIndicator={false}>
        <Label style={{ color: colors.lime }}>— A PERSONAL ATLAS OF YOUR YEAR</Label>
        <Text style={styles.display}>Your year.{"\n"}Your places.{"\n"}<Text style={{ color: colors.lime }}>Your story.</Text></Text>
        <Text style={styles.lede}>Location Wrapped remembers the places you go and turns your year into a story.</Text>
        <View style={styles.actionStack}>
          <PrimaryButton title="Start My Wrapped" icon="arrow-right" testID="button-start-wrapped" onPress={() => router.push('/onboarding/1')} />
          <PrimaryButton title="Try Demo" icon="chevron-right" variant="secondary" testID="button-try-demo" onPress={() => { startDemo(); router.replace('/(tabs)'); }} />
        </View>
        <View style={styles.artWrap} accessible accessibilityLabel="Every place means something">
          <View style={[styles.orbit, styles.orbitOuter, { borderColor: colors.border }]} />
          <View style={[styles.orbit, styles.orbitMiddle, { borderColor: colors.border }]} />
          <View style={[styles.orbit, styles.orbitInner, { borderColor: colors.border }]} />
          <View style={styles.artDisc}>
            <View style={[styles.artCore, { borderColor: colors.background }]} />
          </View>
          <View style={[styles.artDot, { backgroundColor: colors.lime }]} />
          <View style={[styles.artDot, styles.artDotOrange, { backgroundColor: colors.orange }]} />
          <Label style={styles.artCaption}>EVERY PLACE MEANS SOMETHING</Label>
        </View>
      </ScrollView>
      <View style={[styles.landingFooter, { borderTopColor: colors.border }]}><Label>YOUR PLACES, YOUR PACE.</Label><Label>MADE FOR LOOKING BACK.</Label></View>
    </SafeAreaView>
  );
}

const onboardingCopy = [
  { title: 'Your year starts here', copy: 'Location Wrapped records the places you visit so you can look back on where your year took you.', icon: 'compass-outline' as const },
  { title: 'Built around your privacy', copy: 'Location access is always your choice. Pause tracking whenever you like, or delete your location history in Profile.', icon: 'lock-closed-outline' as const },
  { title: 'Enable Location Tracking', copy: 'Give this app location access to start collecting your own story, from this moment on.', icon: 'location-outline' as const },
];

export function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const step = Math.min(3, Math.max(1, Number(pathname.split('/').filter(Boolean).at(-1)) || 1));
  const content = onboardingCopy[step - 1];
  const nextStepRoute = step === 1 ? '/onboarding/2' : '/onboarding/3';
  const { state, requestAccess, startDemo, openSettings } = useLocation();
  const [pending, setPending] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const denied = state.status === 'denied' || state.status === 'unavailable';
  const stepColor = step === 2 ? colors.pink : step === 3 ? colors.primary : colors.lime;

  useEffect(() => {
    if (step === 3 && state.status === 'active' && state.mode === 'real') router.replace('/tracking');
  }, [step, state.status, state.mode]);

  const allow = async () => {
    setPending(true);
    setPermissionError(false);
    try {
      await Promise.resolve(requestAccess());
    } catch {
      setPermissionError(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.page, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={[styles.topbar, { borderBottomColor: colors.border }]}><Brand landing /></View>
      <ScrollView contentContainerStyle={styles.onboardScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.onboardVisual}>
          <View style={[styles.visualRing, styles.visualRingOuter, { borderColor: `${stepColor}33` }]} />
          <View style={[styles.visualRing, styles.visualRingInner, { borderColor: `${stepColor}70` }]} />
          <View style={[styles.visualCore, { backgroundColor: stepColor }]}><Ionicons name={content.icon} size={36} color={step === 3 ? colors.foreground : colors.background} /></View>
        </View>
        <Label style={{ color: colors.lime }}>GETTING STARTED / 0{step} OF 03</Label>
        <Text style={styles.onboardTitle}>{content.title}</Text>
        <Text style={styles.onboardCopy}>{content.copy}</Text>
        {step === 2 ? <Text style={styles.note}><Text style={styles.noteStrong}>Good to know: </Text>Location is collected only while the app is open. It does not track in the background or recover past trips.</Text> : null}
        {step === 3 ? (
          <>
            <Text style={styles.note}><Text style={styles.noteStrong}>A clear boundary: </Text>This app only records location while open. Closing it stops collection; past location history is not imported.</Text>
            {denied || permissionError ? (
              <View style={styles.alert} testID="status-permission-denied">
                <Text style={styles.alertText}>{state.status === 'unavailable' ? 'Location is not available on this device. Check that location services are enabled, then try again.' : 'Location access was not allowed. You can enable it in Settings and try again, or explore the demo instead.'}</Text>
                {state.status === 'denied' && !state.canAskAgain ? <PrimaryButton title="Open Settings" icon="settings" variant="secondary" testID="button-open-settings" onPress={() => { try { openSettings(); } catch { setPermissionError(true); } }} /> : null}
              </View>
            ) : null}
            <PrimaryButton title={pending || state.status === 'requesting' ? 'Requesting access…' : denied ? 'Try Location Access Again' : 'Allow Location Access'} icon={pending ? undefined : 'arrow-right'} testID="button-allow-location" disabled={pending || state.status === 'requesting'} onPress={allow} wide />
            {denied || permissionError ? <PrimaryButton title="Try Demo" icon="chevron-right" variant="secondary" testID="button-demo-after-denial" onPress={() => { startDemo(); router.replace('/(tabs)'); }} wide /> : null}
          </>
        ) : null}
      </ScrollView>
      <View style={[styles.onboardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.stepBars} accessibilityLabel={`Step ${step} of 3`}>{[1, 2, 3].map(number => <View key={number} style={[styles.stepBar, { backgroundColor: number === step ? colors.lime : colors.border }]} />)}</View>
        {step < 3 ? <PrimaryButton title="Continue" icon="arrow-right" testID="button-onboarding-next" onPress={() => router.push(nextStepRoute)} /> : <PrimaryButton title="Back" icon="arrow-left" variant="outline" testID="button-onboarding-back" onPress={() => router.replace('/onboarding/2')} />}
      </View>
    </SafeAreaView>
  );
}

export function TrackingScreen() {
  const { state } = useLocation();
  return (
    <PageFrame mode={state.mode}>
      <Intro label="A NEW CHAPTER" title="You're tracking" description="Your Location Wrapped starts building from here." />
      <SectionTitle>Your tracking status</SectionTitle>
      <StatusCard />
      <Text style={[styles.note, { marginTop: 24, marginBottom: 20 }]}>Location is only collected while this app is open. Keep it open to record visits; closing it stops collection.</Text>
      <PrimaryButton title="Go to Home" icon="arrow-right" testID="button-go-home" onPress={() => router.replace('/(tabs)')} />
    </PageFrame>
  );
}

export function HomeScreen() {
  const colors = useColors();
  const { state } = useLocation();
  const demo = state.mode === 'demo';
  return (
    <PageFrame mode={state.mode}>
      <Intro label={demo ? 'DEMO / SAMPLE HISTORY' : 'YOUR STORY / IN PROGRESS'} title={demo ? 'A year in places.' : 'Your story starts here.'} description={demo ? 'An example of what your location story could look like.' : 'Every visit starts with a single moment.'} />
      <SectionTitle>Tracking</SectionTitle>
      <StatusCard />
      {demo ? (
        <>
          <View style={styles.sectionBlock}>
            <SectionTitle>The little details</SectionTitle>
            <View style={styles.statsCard}>
              <Label style={{ color: colors.lime }}>PLACES IN THIS DEMO</Label>
              <Text style={[styles.heroNumber, { color: colors.lime }]} testID="text-places-visited">{demoStatistics.placesVisited}</Text>
              <Text style={styles.statLabel}>places visited</Text>
              <View style={[styles.statPair, { borderTopColor: colors.border }]}>
                <View style={styles.statHalf}><Label>TIME OUT IN THE WORLD</Label><Text style={styles.statValue} testID="text-days-tracked">{demoStatistics.daysTracked}</Text><Text style={styles.smallMuted}>days tracked</Text></View>
                <View style={styles.statHalf}><Label>DISTANCE COVERED</Label><Text style={styles.statValue} testID="text-distance">{demoStatistics.distanceKm}<Text style={styles.km}> km</Text></Text><Text style={styles.smallMuted}>along the way</Text></View>
              </View>
              <View style={[styles.statLine, { borderBottomColor: colors.border }]}><Label>MOST VISITED</Label><Text style={styles.statLineValue} testID="text-most-visited">{demoStatistics.mostVisitedPlace}</Text></View>
              <View style={[styles.statLine, { borderBottomColor: colors.border }]}><Label>MOST ACTIVE DAY</Label><Text style={styles.statLineValue} testID="text-most-active-day">{demoStatistics.mostActiveDay}</Text></View>
            </View>
          </View>
          <View style={styles.sectionBlock}>
            <SectionTitle>The story so far</SectionTitle>
            <WrappedTeaser demo />
          </View>
        </>
      ) : (
        <>
          <View style={styles.sectionBlock}>
            <SectionTitle>Your places</SectionTitle>
            <EmptyCard title="The map begins with you." action={<PrimaryButton title="View your map" icon="arrow-right" variant="secondary" testID="button-view-map" onPress={() => router.push('/(tabs)/map')} />}>
              No places yet. Your recorded coordinates will appear as you keep this app open and move around. We won't invent places or visits.
            </EmptyCard>
          </View>
          <View style={styles.sectionBlock}>
            <SectionTitle>Your Wrapped</SectionTitle>
            <WrappedTeaser />
          </View>
        </>
      )}
    </PageFrame>
  );
}

function WrappedTeaser({ demo = false }: { demo?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.teaser, { backgroundColor: nativePalette.wrappedCard }]}>
      <Label style={{ color: colors.pink }}>{demo ? 'WRAPPED / DEMO PREVIEW' : 'YOUR STORY / JUST BEGINNING'}</Label>
      <Text style={styles.teaserTitle}>Your Wrapped is building...</Text>
      <Text style={styles.teaserCopy}>{demo ? 'See how the places you return to become a story worth keeping.' : 'Once you’ve collected enough of your own history, there will be a story to tell. For now, explore a clearly labeled sample.'}</Text>
      <View style={[styles.progressTrack, { backgroundColor: nativePalette.progressTrack }]}><View style={[styles.progressFill, { backgroundColor: colors.pink }]} /></View>
      <Pressable onPress={() => router.push('/(tabs)/wrapped')} testID="button-preview-wrapped" style={styles.textLink}><Text style={{ color: colors.lime, fontWeight: '700' }}>{demo ? 'Explore demo Wrapped' : 'See demo preview'}</Text><Feather name="arrow-right" size={16} color={colors.lime} /></Pressable>
    </View>
  );
}

function positionOf(lat: number, lng: number, points: { lat: number; lng: number }[]) {
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const x = maxLng === minLng ? 0.5 : 0.12 + ((lng - minLng) / (maxLng - minLng)) * 0.76;
  const y = maxLat === minLat ? 0.5 : 0.14 + (1 - (lat - minLat) / (maxLat - minLat)) * 0.72;
  return { left: `${x * 100}%` as `${number}%`, top: `${y * 100}%` as `${number}%` };
}

function dateLabel(value: string | number | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function MapScreen() {
  const colors = useColors();
  const { state } = useLocation();
  const demo = state.mode === 'demo';
  const places = demo ? demoPlaces : [];
  const records = state.mode === 'real' ? (state.records as RecordLocation[]).slice(-12) : [];
  const points = demo ? places : records;
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordLocation | null>(null);
  const selected = selectedPlace || selectedRecord;
  const closeDetails = () => { setSelectedPlace(null); setSelectedRecord(null); };
  return (
    <PageFrame mode={state.mode}>
      <Intro label={demo ? 'DEMO / SAMPLE MAP' : 'YOUR MAP / LIVE RECORDS'} title="Your map." description={demo ? 'The places in this sample story. Tap a marker to take a closer look.' : 'Only your recorded coordinates appear here. Place names and visit summaries are not available yet.'} />
      <View style={[styles.mapCanvas, { backgroundColor: colors.map }]} accessibilityLabel={demo ? 'Illustrated demo map with clickable place markers' : 'Illustrated map of recorded coordinates'}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
          <Rect width="400" height="500" fill={colors.map} />
          <Path d="M-40 85 L430 420 M-40 20 L430 355 M-35 180 L420 495 M10 -35 L380 540 M120 -30 L490 545 M250 -30 L620 545" stroke={colors.mapRoad} strokeWidth="4" opacity=".65" />
          <Path d="M155 -25 L282 525" stroke={nativePalette.water} strokeWidth="88" opacity=".9" />
          <Path d="M126 50 L210 32 L246 115 L164 132 Z M280 75 L376 94 L359 172 L267 160 Z M22 324 L119 290 L145 384 L44 420 Z M276 354 L356 330 L393 402 L303 447 Z" fill={colors.mapPark} opacity=".8" />
          <Path d="M-30 272 Q126 218 430 330" stroke={nativePalette.mapRoad} strokeWidth="10" opacity=".58" fill="none" />
          <Path d="M90 130 C150 175 124 254 219 255 C310 257 270 360 346 388" stroke={colors.lime} strokeWidth="2" strokeDasharray="5 8" opacity=".55" fill="none" />
          <Circle cx="200" cy="246" r="85" stroke={nativePalette.white} strokeWidth="1" opacity=".12" fill="none" />
        </Svg>
        <View style={styles.mapKey}><Label style={{ color: colors.foreground }}>{demo ? 'SAMPLE MAP / NOT TO SCALE' : 'YOUR RECORDS / SCHEMATIC VIEW'}</Label></View>
        <View style={styles.mapLabelOne}><Label style={styles.mapLabelText}>THE NEIGHBORHOOD</Label></View>
        <View style={styles.mapLabelTwo}><Label style={styles.mapLabelText}>A PLACE TO REMEMBER</Label></View>
        {points.map((point, index) => {
          const pos = positionOf(point.lat, point.lng, points);
          return (
            <Pressable
              key={demo ? (point as Place).id : `${(point as RecordLocation).timestamp}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={demo ? `View ${(point as Place).name}` : `View recorded location ${index + 1}`}
              testID={demo ? `button-map-marker-${(point as Place).id}` : `button-record-marker-${index}`}
              onPress={() => demo ? setSelectedPlace(point as Place) : setSelectedRecord(point as RecordLocation)}
              style={({ pressed }) => [styles.mapMarker, { left: pos.left, top: pos.top, backgroundColor: selected === point ? colors.pink : colors.lime, borderColor: colors.background }, pressed && styles.pressed]}
            >
              <Ionicons name="location" size={17} color={colors.background} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.sectionBlock}>
        <SectionTitle>{demo ? `${places.length} sample places` : 'Recorded coordinates'}</SectionTitle>
        {demo ? places.map(place => (
          <Pressable key={place.id} testID={`button-place-${place.id}`} onPress={() => setSelectedPlace(place)} style={[styles.placeRow, { borderBottomColor: colors.border }]}>
            <View style={styles.placeText}><Text style={styles.placeName}>{place.name}</Text><Text style={styles.smallMuted}>{place.category} · {place.visits} visits</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )) : records.length ? records.slice().reverse().map((record, index) => (
          <Pressable key={`${record.timestamp}-${index}`} testID={`button-record-${index}`} onPress={() => setSelectedRecord(record)} style={[styles.placeRow, { borderBottomColor: colors.border }]}>
            <View style={styles.placeText}><Text style={styles.placeName}>{formatCoordinates(record.lat, record.lng)}</Text><Text style={styles.smallMuted}>{prettyTime(record.timestamp)}</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )) : (
          <EmptyCard title="No points on your map yet.">Keep this app open with tracking active to record your first location. There are no sample places mixed into your history.</EmptyCard>
        )}
      </View>
      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={closeDetails} statusBarTranslucent>
        <View style={styles.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDetails} accessibilityLabel="Close details" />
          <SafeAreaView edges={['bottom']} style={[styles.detailSheet, { backgroundColor: nativePalette.sheet }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <View style={styles.sheetHeadingText}>
                <Label style={{ color: colors.lime }}>{selectedPlace ? 'DEMO PLACE' : 'YOUR RECORDED POINT'}</Label>
                <Text style={styles.sheetTitle} testID="text-place-name">{selectedPlace?.name ?? (selectedRecord ? formatCoordinates(selectedRecord.lat, selectedRecord.lng) : '')}</Text>
              </View>
              <Pressable onPress={closeDetails} accessibilityLabel="Close details" testID="button-close-details" style={[styles.closeButton, { backgroundColor: nativePalette.close }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
            </View>
            <View style={[styles.detailGrid, { borderTopColor: colors.border }]}>
              <Detail label="Visits" value={selectedPlace ? String(selectedPlace.visits) : 'Not available yet'} testID="text-place-visits" />
              <Detail label="Time spent" value={selectedPlace?.timeSpent ?? 'Not available yet'} testID="text-place-time" />
              <Detail label="Last visited" value={selectedPlace ? dateLabel(selectedPlace.lastVisited) : dateLabel(selectedRecord?.timestamp ?? null)} testID="text-place-last-visited" />
              <Detail label="Location" value={selected ? formatCoordinates(selected.lat, selected.lng) : ''} />
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </PageFrame>
  );
}

function Detail({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return <View style={styles.detailItem}><Text style={styles.smallMuted}>{label}</Text><Text style={styles.detailValue} testID={testID}>{value}</Text></View>;
}

const wrappedColors: Record<string, { background: string; foreground: string; spark: string }> = {
  purple: { background: nativePalette.purple, foreground: nativePalette.white, spark: nativePalette.pink },
  orange: { background: nativePalette.orange, foreground: nativePalette.foregroundStory, spark: nativePalette.lime },
  blue: { background: nativePalette.lime, foreground: nativePalette.blueInk, spark: nativePalette.purple },
};

export function WrappedScreen() {
  const colors = useColors();
  const { state } = useLocation();
  const { play } = useLocalSearchParams<{ play?: string }>();
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => { if (play === '1') setIndex(0); }, [play]);
  const cards = demoWrappedCards.slice(0, 3);
  const card = index === null ? null : cards[index];
  const close = () => setIndex(null);
  const next = () => setIndex(current => current === null ? 0 : current >= cards.length - 1 ? 0 : current + 1);
  const previous = () => setIndex(current => current === null ? null : Math.max(0, current - 1));
  const theme = card ? wrappedColors[card.theme] ?? wrappedColors.purple : wrappedColors.purple;
  return (
    <PageFrame mode={state.mode}>
      <Intro label="WRAPPED / PREVIEW" title="A story in the making." description={state.mode === 'demo' ? 'Three moments from a sample year. This is demo data, not your own history.' : 'Your personal Wrapped needs more history. Explore a clearly labeled sample of how it could feel.'} />
      <View style={[styles.wrappedEntry, { backgroundColor: colors.card }]}>
        <Label style={{ color: colors.lime }}>03 CARDS / DEMO STORY</Label>
        <View style={styles.wrappedEntryOrbit} />
        <Text style={styles.wrappedEntryTitle}>Every place leaves a little something behind.</Text>
        <Text style={styles.bodyMuted}>Take a look at a sample Wrapped while your own story begins to grow.</Text>
        <PrimaryButton title="Play demo Wrapped" icon="arrow-right" testID="button-play-wrapped" onPress={() => setIndex(0)} />
      </View>
      <Modal visible={index !== null} animationType="fade" onRequestClose={close} statusBarTranslucent>
        {card ? (
          <View style={[styles.story, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.foreground === nativePalette.white ? 'light-content' : 'dark-content'} />
            <SafeAreaView edges={['top', 'bottom']} style={styles.storySafe}>
              <View style={styles.storyProgress}>{cards.map((item, number) => <Pressable key={item.id} accessibilityLabel={`Go to card ${number + 1}`} testID={`button-story-progress-${number}`} onPress={() => setIndex(number)} style={[styles.storyProgressItem, { backgroundColor: number <= (index ?? 0) ? theme.foreground : `${theme.foreground}47` }]} />)}</View>
              <View style={styles.storyHeader}><Label style={{ color: theme.foreground, opacity: 0.75 }}>LOCATION WRAPPED / DEMO</Label><Pressable onPress={close} accessibilityLabel="Close Wrapped" testID="button-close-wrapped" style={styles.storyClose}><Feather name="x" size={19} color={theme.foreground} /></Pressable></View>
              <View style={styles.storyBody}>
                <Label style={{ color: theme.foreground, marginBottom: 25 }}>{card.kicker}</Label>
                <Text style={[styles.storyTitle, { color: theme.foreground }]} testID="text-story-title">{card.title}</Text>
                <Text style={[styles.storyMetric, { color: theme.foreground }]} testID="text-story-metric">{card.metric}</Text>
                <Text style={[styles.storyCaption, { color: theme.foreground }]}>{card.caption}</Text>
              </View>
              <View style={styles.storyFooter}>
                <Pressable disabled={index === 0} onPress={previous} testID="button-previous-card" style={styles.storyAction}><Feather name="arrow-left" size={18} color={theme.foreground} /><Text style={[styles.storyActionText, { color: theme.foreground, opacity: index === 0 ? 0.45 : 1 }]}>Previous</Text></Pressable>
                <Label style={{ color: theme.foreground, opacity: 0.8 }}>0{(index ?? 0) + 1} / 0{cards.length}</Label>
                {index === cards.length - 1 ? <Pressable onPress={() => setIndex(0)} testID="button-replay-wrapped" style={styles.storyAction}><Text style={[styles.storyActionText, { color: theme.foreground }]}>Replay</Text><Feather name="rotate-ccw" size={18} color={theme.foreground} /></Pressable> : <Pressable onPress={next} testID="button-next-card" style={styles.storyAction}><Text style={[styles.storyActionText, { color: theme.foreground }]}>Next</Text><Feather name="arrow-right" size={18} color={theme.foreground} /></Pressable>}
              </View>
            </SafeAreaView>
            <View pointerEvents="none" style={[styles.storyRing, { borderColor: theme.foreground }]} />
          </View>
        ) : null}
      </Modal>
    </PageFrame>
  );
}

export function ProfileScreen() {
  const colors = useColors();
  const { state, pause, resume, clearHistory } = useLocation();
  const demo = state.mode === 'demo';
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canToggle = state.status === 'active' || state.status === 'paused';
  const toggle = () => state.status === 'active' ? pause() : resume();
  const erase = async () => {
    setDeleting(true);
    try {
      await clearHistory();
      setConfirm(false);
      setMessage('Your location history has been deleted from this device.');
    } catch {
      setMessage('Could not delete saved history. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  return (
    <PageFrame mode={state.mode}>
      <Intro label="YOUR SPACE / SETTINGS" title="Your space." description="Your location story belongs to you. You're always in control." />
      {message ? <Text accessibilityRole="alert" testID="status-delete-success" style={styles.success}>{message}</Text> : null}
      <SectionTitle>Tracking</SectionTitle>
      <StatusCard />
      <View style={styles.sectionBlock}>
        <SectionTitle>Your controls</SectionTitle>
        <View style={[styles.settingsList, { borderTopColor: colors.border }]}>
          {demo ? <SettingRow title="Start your own story" copy="Enable location access and leave the sample behind." icon="arrow-right" testID="button-start-real-tracking" onPress={() => router.push('/onboarding/1')} /> : (
            <SettingRow title={state.status === 'active' ? 'Pause tracking' : 'Resume tracking'} copy={state.status === 'active' ? 'Stop recording new locations for now.' : 'Start recording again while this app is open.'} icon={state.status === 'active' ? 'pause' : 'play'} testID="button-toggle-tracking" disabled={!canToggle} onPress={toggle} />
          )}
          <SettingRow title="Replay demo Wrapped" copy="A preview with sample data, never your history." icon="rotate-ccw" testID="button-replay-demo" onPress={() => router.push('/(tabs)/wrapped?play=1')} />
          <SettingRow title={demo ? 'Leave demo & clear history' : 'Delete location history'} copy={demo ? 'Remove the demo and any stored location records.' : 'Permanently remove your recorded locations from this device.'} icon="trash-2" danger testID="button-delete-history" onPress={() => setConfirm(true)} />
        </View>
      </View>
      <View style={[styles.aboutCard, { backgroundColor: colors.card }]}>
        <Label style={{ color: colors.lime }}>ABOUT THE APP</Label>
        <Text style={styles.aboutTitle}>About Location Wrapped</Text>
        <Text style={styles.bodyMuted}>Location Wrapped turns the places you go into a story of your year. In this first version, tracking begins only when you grant permission and works only while this app is open. It cannot track in the background, import past trips, or identify place names from your coordinates. Demo content is always labeled and kept separate from your history.</Text>
      </View>
      <Modal visible={confirm} animationType="slide" transparent onRequestClose={() => setConfirm(false)} statusBarTranslucent>
        <View style={styles.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirm(false)} />
          <SafeAreaView edges={['bottom']} style={[styles.detailSheet, { backgroundColor: nativePalette.sheet }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <View style={styles.sheetHeadingText}><Label style={{ color: colors.pink }}>THIS CAN’T BE UNDONE</Label><Text style={styles.sheetTitle}>Delete your history?</Text></View>
              <Pressable onPress={() => setConfirm(false)} accessibilityLabel="Close confirmation" testID="button-close-confirmation" style={[styles.closeButton, { backgroundColor: nativePalette.close }]}><Feather name="x" size={18} color={colors.foreground} /></Pressable>
            </View>
            <Text style={[styles.bodyMuted, { marginBottom: 22 }]}>This removes your saved location records from this device. Your demo preview can always be opened again.</Text>
            <View style={styles.confirmActions}>
              <View style={styles.confirmAction}><PrimaryButton title="Keep history" variant="outline" testID="button-cancel-delete" onPress={() => setConfirm(false)} wide /></View>
              <View style={styles.confirmAction}><PrimaryButton title={deleting ? 'Deleting…' : 'Delete history'} variant="danger" disabled={deleting} testID="button-confirm-delete" onPress={erase} wide /></View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </PageFrame>
  );
}

function SettingRow({ title, copy, icon, testID, onPress, disabled, danger }: { title: string; copy: string; icon: React.ComponentProps<typeof Feather>['name']; testID: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} testID={testID} onPress={onPress} style={({ pressed }) => [styles.settingRow, { borderBottomColor: colors.border }, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <View style={styles.settingCopy}><Text style={[styles.settingTitle, danger && { color: colors.pink }]}>{title}</Text><Text style={styles.smallMuted}>{copy}</Text></View>
      <Feather name={icon} size={19} color={danger ? colors.pink : colors.lime} />
    </Pressable>
  );
}

export function NotFoundScreen() {
  const colors = useColors();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.notFound, { backgroundColor: colors.background }]}>
      <View style={styles.topbar}><Brand landing /></View>
      <View style={styles.notFoundContent}>
        <Label style={{ color: colors.lime }}>AN UNMAPPED TURN / 404</Label>
        <Text style={styles.pageTitle}>This place isn't on the map.</Text>
        <Text style={styles.introCopy}>Let's get you back to somewhere familiar.</Text>
        <PrimaryButton title="Back to the beginning" icon="arrow-left" testID="link-return-home" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  topSafe: { backgroundColor: 'transparent' },
  topbar: { minHeight: 68, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { height: 31, width: 31, borderWidth: 2, borderRadius: 17, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-24deg' }] },
  brandName: { color: nativePalette.white, fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.9 },
  brandTag: { fontSize: 8, letterSpacing: 1 },
  modeBadge: { fontFamily: 'Inter_500Medium', fontSize: 9, letterSpacing: 1.2, borderWidth: 1, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 7 },
  eyebrow: { color: nativePalette.label, fontFamily: 'Inter_500Medium', fontSize: 9, lineHeight: 14, letterSpacing: 1.5 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 104 },
  intro: { paddingTop: 31, paddingBottom: 26 },
  pageTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 43, lineHeight: 47, letterSpacing: -3, marginTop: 8 },
  introCopy: { color: nativePalette.foregroundMuted, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 400 },
  sectionTitle: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 20, letterSpacing: -0.8, marginBottom: 14, marginTop: 4 },
  panel: { borderRadius: 18, padding: 20 },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  statusLead: { flexDirection: 'row', gap: 13, flex: 1 },
  statusDot: { width: 8, height: 8, marginTop: 7, borderRadius: 4 },
  statusText: { flex: 1 },
  statusTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: -1, marginBottom: 4 },
  bodyMuted: { color: nativePalette.foregroundSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  statusStats: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 16, flexDirection: 'row', gap: 12 },
  statusStat: { flex: 1 },
  smallMuted: { color: nativePalette.foregroundQuiet, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  statusValue: { color: nativePalette.white, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17, marginTop: 6 },
  errorText: { color: nativePalette.foregroundError, marginTop: 16, fontSize: 13, lineHeight: 19 },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17, alignSelf: 'flex-start' },
  button: { minHeight: 50, borderRadius: 9, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, alignSelf: 'flex-start' },
  buttonWide: { alignSelf: 'stretch' },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: -0.25 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  emptyCard: { padding: 24 },
  emptyIcon: { height: 46, width: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -1, marginBottom: 8 },
  sectionBlock: { marginTop: 28 },
  statsCard: { paddingTop: 22 },
  heroNumber: { fontFamily: 'Inter_700Bold', fontSize: 112, lineHeight: 112, letterSpacing: -11, marginLeft: -5, marginTop: 17 },
  statLabel: { color: nativePalette.white, fontFamily: 'Inter_500Medium', fontSize: 15, marginTop: 4, paddingBottom: 23 },
  statPair: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 20, gap: 15 },
  statHalf: { flex: 1 },
  statValue: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 39, letterSpacing: -2, marginTop: 7, marginBottom: 2 },
  km: { color: nativePalette.white, fontSize: 17 },
  statLine: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statLineValue: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  teaser: { borderRadius: 18, padding: 23, overflow: 'hidden' },
  teaserTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 30, letterSpacing: -1.5, marginTop: 15, marginBottom: 10, maxWidth: 300 },
  teaserCopy: { color: nativePalette.teaserCopy, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
  progressTrack: { height: 3, borderRadius: 3, marginTop: 24, marginBottom: 2 },
  progressFill: { height: 3, width: '28%', borderRadius: 3 },
  landing: { flex: 1, paddingHorizontal: 16 },
  landingScroll: { paddingTop: 33, paddingBottom: 24 },
  display: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 57, lineHeight: 54, letterSpacing: -5.6, marginTop: 22 },
  lede: { color: nativePalette.lede, fontFamily: 'Inter_400Regular', fontSize: 17, lineHeight: 25, marginTop: 21, maxWidth: 355 },
  actionStack: { gap: 10, alignItems: 'stretch', marginTop: 22 },
  artWrap: { width: '89%', aspectRatio: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 10 },
  orbit: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  orbitOuter: { width: '100%', height: '100%', transform: [{ rotate: '-18deg' }, { scaleX: 0.85 }] },
  orbitMiddle: { width: '75%', height: '75%', transform: [{ rotate: '28deg' }, { scaleX: 0.92 }] },
  orbitInner: { width: '52%', height: '52%', transform: [{ rotate: '-35deg' }, { scaleX: 0.9 }] },
  artDisc: { width: '57%', aspectRatio: 1, borderRadius: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: nativePalette.art, borderWidth: 1, borderColor: nativePalette.pink, transform: [{ rotate: '-17deg' }] },
  artCore: { width: '36%', aspectRatio: 1, borderWidth: 12, borderRadius: 100, backgroundColor: nativePalette.purple },
  artDot: { position: 'absolute', top: '14%', left: '20%', width: 15, height: 15, borderRadius: 9 },
  artDotOrange: { top: '75%', left: '78%', width: 10, height: 10 },
  artCaption: { position: 'absolute', bottom: '5%', right: 0, fontSize: 8, letterSpacing: 1 },
  landingFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, paddingBottom: 7, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  onboardScroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 20 },
  onboardVisual: { width: '100%', aspectRatio: 1.28, maxHeight: 265, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  visualRing: { position: 'absolute', aspectRatio: 1, borderWidth: 1, borderRadius: 200 },
  visualRingOuter: { width: '83%' },
  visualRingInner: { width: '59%' },
  visualCore: { width: '35%', aspectRatio: 1, borderRadius: 200, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-12deg' }] },
  onboardTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 38, lineHeight: 40, letterSpacing: -2.7, marginTop: 12 },
  onboardCopy: { color: nativePalette.foregroundMuted, fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 25, marginTop: 14, marginBottom: 19 },
  note: { color: nativePalette.foregroundSubtle, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, marginBottom: 18 },
  noteStrong: { color: nativePalette.foregroundNote, fontFamily: 'Inter_600SemiBold' },
  alert: { backgroundColor: nativePalette.alert, borderRadius: 10, padding: 14, marginBottom: 16, gap: 13 },
  alertText: { color: nativePalette.foregroundError, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  onboardFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  stepBars: { flexDirection: 'row', gap: 6 },
  stepBar: { width: 24, height: 3, borderRadius: 3 },
  mapCanvas: { height: 400, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  mapKey: { position: 'absolute', left: 12, top: 13, borderRadius: 6, backgroundColor: nativePalette.ink, paddingHorizontal: 9, paddingVertical: 7 },
  mapLabelOne: { position: 'absolute', top: '39%', left: '8%' },
  mapLabelTwo: { position: 'absolute', bottom: '22%', right: '8%' },
  mapLabelText: { color: nativePalette.foregroundMap, fontSize: 8, opacity: 0.75, letterSpacing: 1.2 },
  mapMarker: { position: 'absolute', width: 36, height: 36, marginLeft: -18, marginTop: -18, borderRadius: 18, borderWidth: 3, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  placeRow: { minHeight: 67, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15 },
  placeText: { flex: 1 },
  placeName: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: nativePalette.overlay },
  detailSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, paddingHorizontal: 22, paddingBottom: 18 },
  sheetHandle: { width: 38, height: 4, backgroundColor: nativePalette.sheetHandle, borderRadius: 3, alignSelf: 'center', marginBottom: 23 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  sheetHeadingText: { flex: 1 },
  sheetTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 34, letterSpacing: -1.8, marginTop: 6, marginBottom: 20 },
  closeButton: { height: 34, width: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailGrid: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 18, paddingBottom: 18, flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
  detailItem: { width: '50%', paddingRight: 9 },
  detailValue: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 21, letterSpacing: -0.4, marginTop: 6 },
  wrappedEntry: { minHeight: 350, padding: 24, borderRadius: 18, justifyContent: 'space-between', overflow: 'hidden', gap: 14 },
  wrappedEntryOrbit: { position: 'absolute', width: 230, height: 230, borderWidth: 45, borderColor: nativePalette.purple, borderRadius: 120, right: -88, top: -92, opacity: 0.52 },
  wrappedEntryTitle: { color: nativePalette.white, fontFamily: 'Inter_700Bold', fontSize: 39, lineHeight: 41, letterSpacing: -2.7, maxWidth: 340, marginTop: 30 },
  story: { flex: 1, overflow: 'hidden' },
  storySafe: { flex: 1, paddingHorizontal: 16 },
  storyProgress: { flexDirection: 'row', gap: 5, paddingTop: 9 },
  storyProgressItem: { height: 3, borderRadius: 3, flex: 1 },
  storyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 },
  storyClose: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: nativePalette.storyClose },
  storyBody: { flex: 1, justifyContent: 'center', paddingVertical: 26 },
  storyTitle: { fontFamily: 'Inter_700Bold', fontSize: 58, lineHeight: 58, letterSpacing: -5, maxWidth: 375 },
  storyMetric: { fontFamily: 'Inter_700Bold', fontSize: 48, lineHeight: 54, letterSpacing: -4, marginTop: 26 },
  storyCaption: { fontFamily: 'Inter_500Medium', fontSize: 17, lineHeight: 25, maxWidth: 350, marginTop: 21 },
  storyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingBottom: 6 },
  storyAction: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 7 },
  storyActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  storyRing: { position: 'absolute', pointerEvents: 'none', width: 320, height: 320, borderWidth: 42, borderRadius: 180, opacity: 0.1, right: -200, top: '12%' },
  settingsList: { borderTopWidth: StyleSheet.hairlineWidth },
  settingRow: { minHeight: 73, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  settingCopy: { flex: 1 },
  settingTitle: { color: nativePalette.white, fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 4 },
  aboutCard: { borderRadius: 18, padding: 21, marginTop: 28 },
  aboutTitle: { color: nativePalette.white, fontFamily: 'Inter_600SemiBold', fontSize: 21, letterSpacing: -0.9, marginTop: 13, marginBottom: 8 },
  success: { backgroundColor: nativePalette.success, borderRadius: 10, padding: 14, color: nativePalette.successText, marginBottom: 18, fontSize: 13, lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 9 },
  confirmAction: { flex: 1 },
  notFound: { flex: 1, paddingHorizontal: 16 },
  notFoundContent: { flex: 1, justifyContent: 'center', gap: 15 },
});