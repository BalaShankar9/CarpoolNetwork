import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationDetails {
  address: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  value?: string;
  onChange?: (value: string, placeDetails?: google.maps.places.PlaceResult) => void;
  onLocationSelect?: (location: LocationDetails) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  id?: string;
}

export default function LocationAutocomplete({
  value = '',
  onChange,
  onLocationSelect,
  placeholder = 'Enter location',
  label,
  required = false,
  id,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isSelectingRef = useRef(false);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (typeof window.google !== 'undefined' && window.google.maps) {
        initAutocomplete();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found');
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkGoogle = setInterval(() => {
          if (typeof window.google !== 'undefined' && window.google.maps) {
            clearInterval(checkGoogle);
            initAutocomplete();
          }
        }, 100);
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initAutocomplete();
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    const initAutocomplete = () => {
      if (!inputRef.current || autocompleteRef.current) return;

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gb' },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address && place.geometry?.location) {
          isSelectingRef.current = true;
          setIsSelected(true);

          if (onChange) {
            onChange(place.formatted_address, place);
          }

          if (onLocationSelect) {
            const locationDetails: LocationDetails = {
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            console.log('Location selected:', locationDetails);
            onLocationSelect(locationDetails);
          }

          setTimeout(() => {
            isSelectingRef.current = false;
          }, 0);
        }
      });

      autocompleteRef.current = autocomplete;
    };

    loadGoogleMaps();
  }, [onChange]);

  useEffect(() => {
    if (inputRef.current && !isSelectingRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSelected(false);
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          defaultValue={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
