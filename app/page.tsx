import React, { ChangeEvent, useEffect, useState } from 'react';
import signalR from '@microsoft/signalr';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<string[]>([]);

  const connection = new signalR.HubConnectionBuilder().withUrl('/chat').build();

  useEffect(() => {
    connection.start().then(() => {
      connection.invoke('send', 'Hello');

      connection.on('message', (message) => {
        setChat([...chat, message]);
      });
    });

    return () => {
      connection.stop()
    };
  },[]);


  const onTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onMessageSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = { message };
    connection.send('send', payload.message);
    setMessage('');
  };

  return (
    <div>
      <h1>Chat Application</h1>
      <form onSubmit={onMessageSubmit}>
        <input
          name="message"
          onChange={onTextChange}
          value={message}
          placeholder="Enter message..."
        />
        <button>Send</button>
      </form>
      <div>
        {chat.map((message) => (
          <div key={message}>{message}</div>
        ))}
      </div>
    </div>
  );
}