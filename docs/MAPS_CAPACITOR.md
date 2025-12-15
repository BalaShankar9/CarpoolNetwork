# Google Maps Setup for Capacitor (Android/iOS)

## API Key Restrictions

For Google Maps to work in Capacitor apps, your API key must allow these origins:

### Required HTTP Referrer Restrictions

Add these to your Google Cloud Console > APIs & Services > Credentials > API Key:

```
http://localhost/*
capacitor://localhost/*
http://localhost:5173/*
```

### For Android

1. Go to Google Cloud Console
2. Navigate to APIs & Services > Credentials
3. Select your Maps API key
4. Under "Application restrictions", choose "Android apps"
5. Add your app's SHA-1 fingerprint and package name:
   - Package name: `co.uk.carpoolnetwork.app`
   - SHA-1: Get from `./gradlew signingReport` in android/ folder

### For iOS

1. Same Google Cloud Console location
2. Under "Application restrictions", choose "iOS apps"
3. Add your bundle identifier: `co.uk.carpoolnetwork.app`

## Troubleshooting

### Blank Map

If the map shows blank/gray:

1. Check browser console for "RefererNotAllowedMapError"
2. Verify API key restrictions include `capacitor://localhost/*`
3. Ensure Maps JavaScript API is enabled in Google Cloud Console
4. Check that billing is enabled on the Google Cloud project

### Autocomplete Not Working

1. Verify Places API is enabled
2. Check API key has Places API access
3. Ensure CORS headers allow Capacitor origins

## Environment Variables

Ensure `.env` contains:

```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Testing Checklist

Run locally with `npm run android` or `npm run ios`:

- [ ] Map renders on Find Rides page
- [ ] Map renders on Ride Details page
- [ ] Location autocomplete works
- [ ] Route polylines display correctly
- [ ] Map markers are clickable
