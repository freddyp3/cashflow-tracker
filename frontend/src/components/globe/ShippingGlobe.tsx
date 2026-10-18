import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import { getOrders } from '../../api/orders';
import { ErrorState, Skeleton, formatMoney } from '../ui';
import GlobeErrorBoundary from './GlobeErrorBoundary';
import isWebGLAvailable from './webglSupport';
import useReducedMotion from './useReducedMotion';
import { VANCOUVER, aggregateDestinations, pointRadius, summarize } from './aggregate';
import type { GlobeSummary } from './aggregate';

interface PointDatum {
  lat: number;
  lng: number;
  color: string;
  radius: number;
  label?: string;
  location?: string;
  orders?: number;
  revenue?: number;
}

interface ArcDatum {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface CountryFeature {
  [key: string]: unknown;
}

const tooltipHtml = (p: object): string => {
  const d = p as PointDatum;
  if (!d.location) {
    return 'Vancouver (origin)';
  }
  const label = d.orders === 1 ? 'order' : 'orders';
  return `<div style="font: 12px Inter, sans-serif; color:#111827; background:#fff; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; box-shadow:0 1px 2px rgba(0,0,0,.05)"><strong>${d.location}</strong><br/>${d.orders} ${label} · ${formatMoney(d.revenue ?? 0)}</div>`;
};

export interface ShippingGlobeProps {
  /** Fixed square size; when omitted the globe fills its container width × height. */
  size?: number;
  height?: number;
  onReady?: (summary: GlobeSummary) => void;
}

export default function ShippingGlobe({ size, height = 600, onReady }: ShippingGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerWidth, setContainerWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const webglSupported = useMemo(() => isWebGLAvailable(), []);
  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: '#e5e7eb', shininess: 6 }),
    [],
  );

  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => getOrders(), enabled: webglSupported });
  const countriesQuery = useQuery({
    enabled: webglSupported,
    queryKey: ['countries-110m'],
    queryFn: () =>
      fetch('/data/countries-110m.json').then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    staleTime: Infinity,
  });

  const dests = useMemo(
    () => aggregateDestinations(ordersQuery.data ?? []),
    [ordersQuery.data],
  );
  const countries: CountryFeature[] = countriesQuery.data?.features ?? [];
  const ready = webglSupported && ordersQuery.isSuccess && countriesQuery.isSuccess;

  const points = useMemo<PointDatum[]>(
    () => [
      { ...VANCOUVER, color: '#166534', radius: 0.5, label: 'Vancouver (origin)' },
      ...dests.map((d) => ({
        ...d,
        color: '#4ade80',
        radius: pointRadius(d.orders),
      })),
    ],
    [dests],
  );

  const arcs = useMemo<ArcDatum[]>(
    () =>
      dests.map((d) => ({
        startLat: VANCOUVER.lat,
        startLng: VANCOUVER.lng,
        endLat: d.lat,
        endLng: d.lng,
      })),
    [dests],
  );

  useEffect(() => {
    if (!ready) return;
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.6;
    if (size != null) {
      controls.enableZoom = false;
    }
    const stopAutoRotate = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener('start', stopAutoRotate);
    globeRef.current?.pointOfView(
      { lat: 35, lng: -60, altitude: size ? 2.2 : 1.8 },
      0,
    );
    return () => controls.removeEventListener('start', stopAutoRotate);
  }, [ready, reducedMotion, size]);

  useEffect(() => {
    if (ordersQuery.isSuccess) {
      onReady?.(summarize(dests));
    }
  }, [dests, ordersQuery.isSuccess, onReady]);

  const observerRef = useRef<ResizeObserver | null>(null);
  const containerRef = (node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver(([entry]) => {
        setContainerWidth(entry.contentRect.width);
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  };

  if (!webglSupported) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ height }}>
        <p className="text-gray-700 font-medium">The globe couldn&apos;t be displayed.</p>
        <p className="text-gray-500 text-sm mt-2 max-w-md">
          Your browser has WebGL disabled, which the globe needs to render. Try enabling
          &quot;Use graphics acceleration&quot; in your browser settings and reloading the page.
        </p>
      </div>
    );
  }

  if (ordersQuery.isError || countriesQuery.isError) {
    const err = (ordersQuery.error ?? countriesQuery.error) as Error | null;
    return (
      <ErrorState
        message={`Error: ${err?.message ?? 'Failed to load data'}`}
        onRetry={() => {
          void ordersQuery.refetch();
          void countriesQuery.refetch();
        }}
      />
    );
  }

  if (!ready) {
    return (
      <div role="status" aria-label="Loading globe" style={{ height }}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const width = size ?? containerWidth;
  const globeHeight = size ?? height;

  return (
    <div
      ref={size == null ? containerRef : undefined}
      style={{ width: '100%', height: globeHeight, display: 'flex', justifyContent: 'center' }}
    >
      {width > 0 && (
        <GlobeErrorBoundary>
          <Globe
            ref={globeRef}
            backgroundColor="#ffffff"
            globeMaterial={globeMaterial}
            showAtmosphere
            atmosphereColor="#d1d5db"
            atmosphereAltitude={0.12}
            polygonsData={countries}
            polygonCapColor={() => '#f59e0b'}
            polygonSideColor={() => '#d97706'}
            polygonStrokeColor={() => '#b45309'}
            polygonAltitude={0.005}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointRadius="radius"
            pointAltitude={0.01}
            pointLabel={tooltipHtml}
            arcsData={arcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor={() => ['#166534', '#4ade80']}
            arcDashLength={0.5}
            arcDashGap={0.2}
            arcStroke={0.5}
            arcDashAnimateTime={reducedMotion ? 0 : 2000}
            width={width}
            height={globeHeight}
          />
        </GlobeErrorBoundary>
      )}
    </div>
  );
}
