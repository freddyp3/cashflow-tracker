import { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshBasicMaterial } from 'three';
import { getOrders } from '../api/orders';
import DESTINATION_COORDS, { VANCOUVER } from '../data/destinationCoords';
import GlobeErrorBoundary from '../components/globe/GlobeErrorBoundary';
import isWebGLAvailable from '../components/globe/webglSupport';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

interface PointData {
  lat: number;
  lng: number;
  color: string;
  radius: number;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface LabelData {
  lat: number;
  lng: number;
  text: string;
}

export default function GlobePage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [countries, setCountries] = useState<object[]>([]);
  const [points, setPoints] = useState<PointData[]>([]);
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [labels, setLabels] = useState<LabelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const globeMaterial = useMemo(() => new MeshBasicMaterial({ color: '#e5e7eb' }), []);
  const webglSupported = useMemo(() => isWebGLAvailable(), []);

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

  useEffect(() => {
    if (!webglSupported) return;
    Promise.all([
      fetch(GEOJSON_URL).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      getOrders(),
    ])
      .then(([geoData, orders]) => {
        setCountries(geoData.features);

        const validOrders = orders.filter(
          (o) => !o.disputed && o.shippingLocation && o.shippingLocation !== 'TBD'
        );

        const destPoints: PointData[] = [];
        const destArcs: ArcData[] = [];
        const destLabels: LabelData[] = [];
        const seenLocations = new Set<string>();
        const seenLabels = new Set<string>();

        for (const order of validOrders) {
          const coord = DESTINATION_COORDS.get(order.shippingLocation);
          if (!coord) continue;

          // One dot per order
          destPoints.push({
            lat: coord.lat,
            lng: coord.lng,
            color: '#4ade80',
            radius: 0.4,
          });

          // One arc per unique destination
          if (!seenLocations.has(order.shippingLocation)) {
            seenLocations.add(order.shippingLocation);
            destArcs.push({
              startLat: VANCOUVER.lat,
              startLng: VANCOUVER.lng,
              endLat: coord.lat,
              endLng: coord.lng,
            });
          }

          // One label per unique label text
          if (!seenLabels.has(coord.label)) {
            seenLabels.add(coord.label);
            destLabels.push({
              lat: coord.lat,
              lng: coord.lng,
              text: coord.label,
            });
          }
        }

        // Vancouver origin point (dark green, larger)
        const allPoints: PointData[] = [
          { lat: VANCOUVER.lat, lng: VANCOUVER.lng, color: '#166534', radius: 0.6 },
          ...destPoints,
        ];

        setPoints(allPoints);
        setArcs(destArcs);
        setLabels(destLabels);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, [webglSupported]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">My Shipping Adventures</h1>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        {!webglSupported && (
          <div className="flex h-[600px] flex-col items-center justify-center text-center">
            <p className="text-gray-700 font-medium">
              The globe couldn&apos;t be displayed.
            </p>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              Your browser has WebGL disabled, which the globe needs to render.
              Try enabling &quot;Use graphics acceleration&quot; in your browser
              settings and reloading the page.
            </p>
          </div>
        )}
        {webglSupported && loading && <p className="text-gray-500">Loading globe data...</p>}
        {webglSupported && error && <p className="text-red-600">Error: {error}</p>}
        {webglSupported && !loading && !error && (
          <div ref={containerRef} style={{ width: '100%', height: '600px', display: 'flex', justifyContent: 'center' }}>
            {containerWidth > 0 && (
              <GlobeErrorBoundary>
              <Globe
                ref={globeRef}
                backgroundColor="#ffffff"
                showAtmosphere={false}
                globeMaterial={globeMaterial}
                polygonsData={countries}
                polygonCapColor={() => '#f59e0b'}
                polygonSideColor={() => '#d97706'}
                polygonStrokeColor={() => '#b45309'}
                pointsData={points}
                pointLat="lat"
                pointLng="lng"
                pointColor="color"
                pointRadius="radius"
                pointAltitude={0.01}
                arcsData={arcs}
                arcStartLat="startLat"
                arcStartLng="startLng"
                arcEndLat="endLat"
                arcEndLng="endLng"
                arcColor={() => ['#166534', '#4ade80']}
                arcDashLength={0.5}
                arcDashGap={0.2}
                arcDashAnimateTime={2000}
                arcStroke={0.5}
                labelsData={labels}
                labelLat="lat"
                labelLng="lng"
                labelText="text"
                labelSize={0.8}
                labelColor={() => '#166534'}
                labelResolution={2}
                labelAltitude={0.01}
                width={containerWidth}
                height={600}
              />
              </GlobeErrorBoundary>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
