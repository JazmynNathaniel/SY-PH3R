import { MessageCard } from "./message-card";

export function MessageItem({
  sender,
  body,
  meta,
  active = false
}: {
  sender: string;
  body: string;
  meta: string;
  active?: boolean;
}) {
  return <MessageCard active={active} body={body} meta={meta} sender={sender} />;
}
