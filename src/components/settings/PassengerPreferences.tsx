import { useNavigate } from 'react-router-dom';
import PassengerFilterCenter from '../preferences/PassengerFilterCenter';

export default function PassengerPreferences() {
  const navigate = useNavigate();

  return (
    <PassengerFilterCenter
      onFiltersChange={() => {}}
      onSearch={() => navigate('/search')}
    />
  );
}
