import PassengerFilterCenter from '../preferences/PassengerFilterCenter';

export default function PassengerPreferences() {
  return (
    <PassengerFilterCenter
      onFiltersChange={() => {}}
      onSearch={() => {}}
      matchCount={0}
    />
  );
}
