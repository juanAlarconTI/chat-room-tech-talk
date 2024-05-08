"use client"
import { HubConnection } from '@microsoft/signalr';
import React, { ChangeEvent, useEffect, useState } from 'react';
import {HubConnectionBuilder}  from '@microsoft/signalr';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<string[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);

  

  useEffect(() => {
    const connectionBuilder = new HubConnectionBuilder()
    .withUrl(process.env.NEXT_PUBLIC_SIGNAL_R_URL ?? '' , {
      accessTokenFactory: () => process.env.NEXT_PUBLIC_SIGNALR_API_KEY ?? ''
    })
    .build();
    setConnection(connectionBuilder);
    connectionBuilder.start().then(() => {
      connectionBuilder.invoke('send', 'Hello');

      connectionBuilder.on('message', (message: string) => {
        setChat([...chat, message]);
      });
    });

    return () => {
      connectionBuilder.stop()
    };
  },[]);


  const onTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const onMessageSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = { message };
    connection?.send('send', payload.message);
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