import { useLocation } from 'react-router-dom';
import MessageList from '../components/messaging/MessageList';

export default function Messages() {
  const location = useLocation();
  const { userId, userName } = (location.state as { userId?: string; userName?: string }) || {};

  return (
    <div>
      <MessageList initialUserId={userId} initialUserName={userName} />
    </div>
  );
}
