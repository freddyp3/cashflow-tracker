export const VANCOUVER = { lat: 49.28, lng: -123.12 };

export interface DestinationCoord {
  lat: number;
  lng: number;
  label: string;
}

/** Static lat/lng lookup keyed by normalized shipping location. */
const DESTINATION_COORDS: Map<string, DestinationCoord> = new Map([
  // Canada
  ['Toronto, ON, CAN', { lat: 43.65, lng: -79.38, label: 'ON' }],
  ['Alliston, ON, CAN', { lat: 44.15, lng: -79.87, label: 'ON' }],
  ['Edmonton, AB, CAN', { lat: 53.55, lng: -113.49, label: 'AB' }],
  ['Kanata, ON, CAN', { lat: 45.30, lng: -75.90, label: 'ON' }],

  // United States
  ['Mooresville, NC, USA', { lat: 35.58, lng: -80.81, label: 'NC' }],
  ['San Antonio, TX, USA', { lat: 29.42, lng: -98.49, label: 'TX' }],
  ['Newport News, VA, USA', { lat: 37.09, lng: -76.47, label: 'VA' }],
  ['Effort, PA, USA', { lat: 41.03, lng: -75.44, label: 'PA' }],
  ['River Vale, NJ, USA', { lat: 41.01, lng: -74.01, label: 'NJ' }],
  ['New York, NY, USA', { lat: 40.71, lng: -74.01, label: 'NY' }],
  ['Dumont, NJ, USA', { lat: 40.94, lng: -73.99, label: 'NJ' }],
  ['Tulsa, OK, USA', { lat: 36.15, lng: -95.99, label: 'OK' }],
  ['Smyrna, TN, USA', { lat: 35.98, lng: -86.52, label: 'TN' }],
  ['Bronx, NY, USA', { lat: 40.84, lng: -73.86, label: 'NY' }],
  ['Anderson, SC, USA', { lat: 34.50, lng: -82.65, label: 'SC' }],
  ['Seagoville, TX, USA', { lat: 32.64, lng: -96.53, label: 'TX' }],
  ['Charlotte, MI, USA', { lat: 42.56, lng: -84.84, label: 'MI' }],
  ['Helena, AL, USA', { lat: 33.30, lng: -86.84, label: 'AL' }],
  ['Charlotte, NC, USA', { lat: 35.23, lng: -80.84, label: 'NC' }],
  ['Norcross, GA, USA', { lat: 33.94, lng: -84.21, label: 'GA' }],
  ['Highland, CA, USA', { lat: 34.13, lng: -117.21, label: 'CA' }],
  ['Suwanee, GA, USA', { lat: 34.05, lng: -84.07, label: 'GA' }],
  ['Aurora, CO, USA', { lat: 39.73, lng: -104.83, label: 'CO' }],
  ['East Williston, NY, USA', { lat: 40.76, lng: -73.63, label: 'NY' }],
  ['Chelsea, MA, USA', { lat: 42.39, lng: -71.03, label: 'MA' }],

  // International
  ['Losone, Ticino, CHE', { lat: 46.17, lng: 8.76, label: 'Ticino' }],
  ['Geneva, N/A, CHE', { lat: 46.20, lng: 6.14, label: 'Geneva' }],
  ['Busan, Nam-gu, KOR', { lat: 35.14, lng: 129.06, label: 'Nam-gu' }],
  ['Burpengary, Queensland, AU', { lat: -27.16, lng: 152.96, label: 'Queensland' }],
  ['Levallois-Perret, Île-de-France, FRA', { lat: 48.89, lng: 2.29, label: 'Île-de-France' }],
  ['Tórshavn, Streymoy, FRO', { lat: 62.01, lng: -6.77, label: 'Streymoy' }],
  ['London, Greater London, ENG', { lat: 51.51, lng: -0.13, label: 'Greater London' }],
  ['Horath, RLP, DEU', { lat: 49.93, lng: 7.07, label: 'RLP' }],
  ['Kastrup, Region Hovedstaden, DNK', { lat: 55.63, lng: 12.63, label: 'Hovedstaden' }],
  ['Bangkok, Bangkok Metropolitan Region, THA', { lat: 13.76, lng: 100.50, label: 'Bangkok' }],
  ['Poole, Dorset, ENG', { lat: 50.72, lng: -1.98, label: 'Dorset' }],
  ['Beacon Hill, NSW, AU', { lat: -33.75, lng: 151.26, label: 'NSW' }],
]);

export default DESTINATION_COORDS;
