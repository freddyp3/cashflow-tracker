import { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshBasicMaterial } from 'three';

const GEOJSON_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

export default function GlobePage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [countries, setCountries] = useState<object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const globeMaterial = useMemo(() => new MeshBasicMaterial({ color: '#e5e7eb' }), []);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCountries(data.features);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Globe</h1>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        {loading && <p className="text-gray-500">Loading globe data...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!loading && !error && (
          <div style={{ width: '100%', height: '600px' }}>
            <Globe
              ref={globeRef}
              backgroundColor="#ffffff"
              showAtmosphere={false}
              globeMaterial={globeMaterial}
              polygonsData={countries}
              polygonCapColor={() => '#f59e0b'}
              polygonSideColor={() => '#d97706'}
              polygonStrokeColor={() => '#b45309'}
              width={800}
              height={600}
            />
          </div>
        )}
      </div>
    </div>
  );
}
