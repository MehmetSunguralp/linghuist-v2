import type { Metadata } from 'next';

import { ChatClient } from '@/components/chat/chat-client';
import { enStrings } from '@/config/en.strings';

export const metadata: Metadata = {
  title: enStrings.community.navChats,
  description: `${enStrings.app.brandName} chats`,
};

export default function ChatsPage() {
  return <ChatClient />;
}

